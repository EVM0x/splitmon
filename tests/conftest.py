"""Test harness for SplitMon.

The repo ships a Hardhat config but no `node_modules`, so these tests compile
contracts/SplitMon.sol with the standalone `solc` binary and execute it on
py-evm through eth-tester. Nothing is mocked: every test runs real bytecode on a
real EVM, with real value transfers.

Requirements: solc 0.8.x on PATH, and `pip install web3 'eth-tester[py-evm]'`.
Run: pytest tests/ -v
"""
import json
import shutil
import subprocess
from pathlib import Path

import pytest
from eth_tester import EthereumTester, PyEVMBackend
from web3 import Web3
from web3.providers.eth_tester import EthereumTesterProvider

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "contracts" / "SplitMon.sol"
ETHER = 10**18


def compile_contract():
    if shutil.which("solc") is None:
        pytest.skip("solc is not on PATH")
    out = subprocess.run(
        ["solc", "--combined-json", "abi,bin", "--optimize", str(SOURCE)],
        capture_output=True, text=True, check=True,
    )
    combined = json.loads(out.stdout)
    key = next(k for k in combined["contracts"] if k.endswith(":SplitMon"))
    return combined["contracts"][key]["abi"], combined["contracts"][key]["bin"]


@pytest.fixture(scope="session")
def compiled():
    return compile_contract()


@pytest.fixture
def chain(compiled):
    """A fresh chain per test, so no test can be rescued by another's state."""
    abi, bytecode = compiled
    tester = EthereumTester(PyEVMBackend())
    w3 = Web3(EthereumTesterProvider(tester))
    return Chain(tester, w3, abi, bytecode)


class Chain:
    def __init__(self, tester, w3, abi, bytecode):
        self.tester = tester
        self.w3 = w3
        self.abi = abi
        self.bytecode = bytecode
        self.creator = w3.eth.accounts[0]
        self.alice = w3.eth.accounts[1]
        self.bob = w3.eth.accounts[2]
        self.carol = w3.eth.accounts[3]
        self.stranger = w3.eth.accounts[4]

    # -- chain helpers -----------------------------------------------------
    @property
    def now(self):
        return self.w3.eth.get_block("latest").timestamp

    def travel(self, seconds):
        self.tester.time_travel(self.now + seconds)
        self.w3.eth.get_block("latest")

    def balance(self, address):
        return self.w3.eth.get_balance(address)

    # -- contract helpers --------------------------------------------------
    def deploy(self):
        factory = self.w3.eth.contract(abi=self.abi, bytecode=self.bytecode)
        receipt = self.w3.eth.wait_for_transaction_receipt(
            factory.constructor().transact({"from": self.creator, "gas": 4_000_000})
        )
        return self.w3.eth.contract(address=receipt.contractAddress, abi=self.abi)

    def send(self, fn, frm, value=0, gas=1_000_000):
        tx = fn.transact({"from": frm, "value": value, "gas": gas})
        receipt = self.w3.eth.wait_for_transaction_receipt(tx)
        assert receipt["status"] == 1, "transaction reverted"
        return receipt

    def fails(self, fn, frm, value=0, gas=1_000_000):
        """The revert reason, from a call that must not go through."""
        try:
            fn.call({"from": frm, "value": value, "gas": gas})
        except Exception as err:  # ContractLogicError carries the require string
            return str(err)
        raise AssertionError("call was expected to revert but did not")

    def event(self, receipt, contract, name):
        return contract.events[name]().process_receipt(receipt)[0]["args"]


@pytest.fixture
def split(chain):
    """A contract with a three-way split: creator, alice, bob, 1 ETH each."""
    contract = chain.deploy()
    deadline = chain.now + 3600
    chain.send(contract.functions.createSplit(
        [chain.alice, chain.bob], deadline, "dinner"), chain.creator, 3 * ETHER)
    return contract, deadline
