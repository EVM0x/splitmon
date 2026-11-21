"""Behavioural tests for the SplitMon contract.

Each test gets its own chain and its own deployment, and every assertion is
about money that moved or money that did not — that is the only thing a bill
splitter can get wrong that matters.
"""
import pytest

from conftest import ETHER

ZERO = "0x" + "00" * 20


def make(chain, participants, per_person=ETHER, title="dinner", deadline_in=3600):
    """Create a split whose total covers the creator plus every participant."""
    contract = chain.deploy()
    total = per_person * (len(participants) + 1)
    chain.send(contract.functions.createSplit(
        participants, chain.now + deadline_in, title), chain.creator, total)
    return contract


# --------------------------------------------------------------- createSplit

def test_create_split_stores_the_terms(chain):
    contract = make(chain, [chain.alice, chain.bob])
    creator, total, per_person, deadline, count, paid, settled, refunded, title, people, paid_flags = \
        contract.functions.getSplit(1).call()
    assert creator == chain.creator
    assert total == 3 * ETHER
    assert per_person == ETHER
    assert count == 3
    assert title == "dinner"
    assert people == [chain.creator, chain.alice, chain.bob]


def test_the_creator_counts_as_a_participant_who_already_paid(chain):
    contract = make(chain, [chain.alice, chain.bob])
    assert contract.functions.isParticipant(1, chain.creator).call() is True
    assert contract.functions.hasPaid(1, chain.creator).call() is True
    assert contract.functions.getSplit(1).call()[5] == 1


def test_the_split_id_starts_at_one_and_increases(chain):
    contract = make(chain, [chain.alice])
    assert contract.functions.createSplit(
        [chain.bob], chain.now + 3600, "second").call(
            {"from": chain.creator, "value": 2 * ETHER}) == 2


def test_a_split_without_participants_is_refused(chain):
    contract = chain.deploy()
    assert "Need at least 1 participant" in chain.fails(
        contract.functions.createSplit([], chain.now + 3600, "x"), chain.creator, ETHER)


def test_more_than_twenty_participants_are_refused(chain):
    contract = chain.deploy()
    people = [chain.w3.to_checksum_address(f"0x{i + 1:040x}") for i in range(21)]
    total = ETHER * 22
    assert "Max 20 participants" in chain.fails(
        contract.functions.createSplit(people, chain.now + 3600, "x"), chain.creator, total)


def test_a_split_must_be_funded(chain):
    contract = chain.deploy()
    assert "Must send total amount" in chain.fails(
        contract.functions.createSplit([chain.alice], chain.now + 3600, "x"), chain.creator, 0)


def test_a_deadline_in_the_past_is_refused(chain):
    contract = chain.deploy()
    assert "Deadline must be in the future" in chain.fails(
        contract.functions.createSplit([chain.alice], chain.now - 1, "x"), chain.creator, 2 * ETHER)


def test_a_deadline_beyond_thirty_days_is_refused(chain):
    contract = chain.deploy()
    assert "Deadline too far" in chain.fails(
        contract.functions.createSplit([chain.alice], chain.now + 31 * 86400, "x"),
        chain.creator, 2 * ETHER)


def test_the_creator_cannot_be_his_own_participant(chain):
    contract = chain.deploy()
    assert "Creator cannot be participant" in chain.fails(
        contract.functions.createSplit([chain.creator], chain.now + 3600, "x"),
        chain.creator, 2 * ETHER)


def test_the_zero_address_is_not_a_participant(chain):
    contract = chain.deploy()
    assert "Invalid participant address" in chain.fails(
        contract.functions.createSplit([ZERO], chain.now + 3600, "x"), chain.creator, 2 * ETHER)


def test_the_same_participant_twice_is_refused(chain):
    contract = chain.deploy()
    assert "Duplicate participant" in chain.fails(
        contract.functions.createSplit([chain.alice, chain.alice], chain.now + 3600, "x"),
        chain.creator, 3 * ETHER)


def test_a_total_that_does_not_divide_evenly_is_refused(chain):
    contract = chain.deploy()
    assert "Amount not evenly divisible" in chain.fails(
        contract.functions.createSplit([chain.alice, chain.bob], chain.now + 3600, "x"),
        chain.creator, 3 * ETHER + 1)


def test_a_direct_transfer_is_refused(chain):
    contract = chain.deploy()
    try:
        chain.tester.call({"from": chain.stranger, "to": contract.address, "value": ETHER})
    except Exception as err:
        assert "Use createSplit or payShare" in str(err)
    else:
        raise AssertionError("a bare transfer was accepted")
    assert chain.balance(contract.address) == 0


# ------------------------------------------------------------------ payShare

def test_a_participant_can_pay_his_share(chain):
    contract = make(chain, [chain.alice, chain.bob])
    receipt = chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    assert contract.functions.hasPaid(1, chain.alice).call() is True
    assert contract.functions.getSplit(1).call()[5] == 2
    assert chain.event(receipt, contract, "PaymentMade")["amount"] == ETHER
    assert chain.balance(contract.address) == 4 * ETHER


def test_a_stranger_cannot_pay(chain):
    contract = make(chain, [chain.alice, chain.bob])
    assert "Not a participant" in chain.fails(
        contract.functions.payShare(1), chain.stranger, ETHER)


def test_nobody_pays_twice(chain):
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    assert "Already paid" in chain.fails(contract.functions.payShare(1), chain.alice, ETHER)


def test_a_payment_must_be_exactly_one_share(chain):
    contract = make(chain, [chain.alice, chain.bob])
    assert "Incorrect payment amount" in chain.fails(
        contract.functions.payShare(1), chain.alice, ETHER - 1)


def test_paying_after_the_deadline_is_refused(chain):
    contract = make(chain, [chain.alice, chain.bob])
    chain.travel(3601)
    assert "Deadline passed" in chain.fails(contract.functions.payShare(1), chain.alice, ETHER)


def test_an_unknown_split_cannot_be_paid(chain):
    contract = chain.deploy()
    assert "Split does not exist" in chain.fails(
        contract.functions.payShare(7), chain.alice, ETHER)


def test_the_last_payment_settles_and_pays_the_creator_everything(chain):
    """The creator funded the whole bill, so he gets his stake back plus every
    reimbursement. Paying out only the total left the reimbursements in the
    contract with no function able to move them."""
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    receipt = chain.send(contract.functions.payShare(1), chain.bob, ETHER)

    settled = chain.event(receipt, contract, "SplitSettled")
    assert settled["amount"] == 5 * ETHER
    assert contract.functions.getSplit(1).call()[6] is True
    assert chain.balance(contract.address) == 0


def test_a_settled_split_takes_no_more_money(chain):
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    chain.send(contract.functions.payShare(1), chain.bob, ETHER)
    assert "Already settled" in chain.fails(contract.functions.payShare(1), chain.carol, ETHER)


# -------------------------------------------------------------- releaseFunds

def test_only_the_creator_releases(chain):
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    assert "Only creator can release" in chain.fails(
        contract.functions.releaseFunds(1), chain.alice)


def test_release_needs_a_second_payer(chain):
    contract = make(chain, [chain.alice, chain.bob])
    assert "Need at least 2 payers" in chain.fails(
        contract.functions.releaseFunds(1), chain.creator)


def test_release_is_refused_once_everybody_paid(chain):
    # the last payment settles on its own, so release can only ever meet a
    # settled split here
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    chain.send(contract.functions.payShare(1), chain.bob, ETHER)
    assert "Already settled" in chain.fails(
        contract.functions.releaseFunds(1), chain.creator)


def test_release_returns_the_stake_plus_the_reimbursement(chain):
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    receipt = chain.send(contract.functions.releaseFunds(1), chain.creator)
    assert chain.event(receipt, contract, "PartialRelease")["amount"] == 2 * ETHER
    assert chain.balance(contract.address) == 2 * ETHER


def test_release_cannot_be_repeated_without_new_money(chain):
    """Second call used to pay the same 2 ETH again and drain the split."""
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    chain.send(contract.functions.releaseFunds(1), chain.creator)
    assert "Nothing to release" in chain.fails(
        contract.functions.releaseFunds(1), chain.creator)
    assert chain.balance(contract.address) == 2 * ETHER


def test_release_after_another_payment_pays_only_the_difference(chain):
    contract = make(chain, [chain.alice, chain.bob, chain.carol])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    chain.send(contract.functions.releaseFunds(1), chain.creator)
    chain.send(contract.functions.payShare(1), chain.bob, ETHER)
    receipt = chain.send(contract.functions.releaseFunds(1), chain.creator)
    assert chain.event(receipt, contract, "PartialRelease")["amount"] == ETHER


def test_settle_after_a_release_pays_only_what_is_left(chain):
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    chain.send(contract.functions.releaseFunds(1), chain.creator)
    receipt = chain.send(contract.functions.payShare(1), chain.bob, ETHER)
    assert chain.event(receipt, contract, "SplitSettled")["amount"] == 3 * ETHER
    assert chain.balance(contract.address) == 0


def test_a_release_does_not_brick_the_last_payment(chain):
    """Before the fix a release could empty the contract, so the final payer's
    payment reverted and he could never complete the split."""
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    chain.send(contract.functions.releaseFunds(1), chain.creator)
    chain.send(contract.functions.payShare(1), chain.bob, ETHER)
    assert contract.functions.getSplit(1).call()[6] is True


# -------------------------------------------------------------------- refund

def test_refund_before_the_deadline_is_refused(chain):
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    assert "Deadline not reached" in chain.fails(contract.functions.refund(1), chain.alice)


def test_somebody_who_did_not_pay_has_nothing_to_refund(chain):
    contract = make(chain, [chain.alice, chain.bob])
    chain.travel(3601)
    assert "Nothing to refund" in chain.fails(contract.functions.refund(1), chain.alice)


def test_a_payer_gets_his_share_back(chain):
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    chain.travel(3601)
    receipt = chain.send(contract.functions.refund(1), chain.alice)
    assert chain.event(receipt, contract, "ParticipantRefunded")["amount"] == ETHER
    assert chain.balance(contract.address) == 3 * ETHER
    assert contract.functions.hasPaid(1, chain.alice).call() is False
    assert contract.functions.getSplit(1).call()[5] == 1


def test_the_split_is_marked_refunded_once_everybody_took_his_money_back(chain):
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    chain.travel(3601)
    chain.send(contract.functions.refund(1), chain.alice)
    receipt = chain.send(contract.functions.refund(1), chain.creator)
    assert contract.functions.getSplit(1).call()[7] is True
    assert chain.event(receipt, contract, "SplitRefunded")["splitId"] == 1


def test_refunds_still_work_after_a_partial_release(chain):
    """A release must never leave the contract unable to honour a refund."""
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    chain.send(contract.functions.releaseFunds(1), chain.creator)
    chain.travel(3601)
    chain.send(contract.functions.refund(1), chain.alice)
    chain.send(contract.functions.refund(1), chain.creator)
    # alice and the creator are whole again; bob never paid, so nothing is owed to him
    assert chain.balance(contract.address) == 0
    assert contract.functions.getSplit(1).call()[7] is True


def test_a_settled_split_cannot_be_refunded(chain):
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.alice, ETHER)
    chain.send(contract.functions.payShare(1), chain.bob, ETHER)
    chain.travel(3601)
    assert "Already settled" in chain.fails(contract.functions.refund(1), chain.alice)


# --------------------------------------------------------------------- views

def test_paid_flags_follow_the_participants(chain):
    contract = make(chain, [chain.alice, chain.bob])
    chain.send(contract.functions.payShare(1), chain.bob, ETHER)
    people, flags = contract.functions.getSplit(1).call()[9:11]
    assert people == [chain.creator, chain.alice, chain.bob]
    assert flags == [True, False, True]


def test_an_unknown_split_has_no_details(chain):
    contract = chain.deploy()
    assert "Split does not exist" in chain.fails(contract.functions.getSplit(1), chain.creator)


def test_membership_answers_for_a_stranger(chain):
    contract = make(chain, [chain.alice])
    assert contract.functions.isParticipant(1, chain.stranger).call() is False
    assert contract.functions.hasPaid(1, chain.stranger).call() is False


@pytest.mark.parametrize("participants,per_person", [
    (1, ETHER),
    (2, 3 * ETHER),
    (4, 7 * ETHER),
])
def test_the_total_always_matches_the_shares(chain, participants, per_person):
    people = chain.w3.eth.accounts[1:1 + participants]
    contract = make(chain, people, per_person)
    _, total, share, _, count, _, _, _, _, _, _ = contract.functions.getSplit(1).call()
    assert share == per_person
    assert count == participants + 1
    assert total == share * count
    assert chain.balance(contract.address) == total
