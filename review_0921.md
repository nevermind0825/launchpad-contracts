# Basic Issues

## IDO.sol

- misunderstanding of specs.
  On fund function, maxFundAmount is the max amount of a certain user during the certain round. For example, maxAmountPerUser is 50 BUSD => users can fund upto 50 BUSD during fcfs round.
  With your fund function, users can fund upto 50 BUSD per transaction during fcfs round.
  One user can buy all (50 BUSD per tx) remaining tokens on fcfs round.
  This works the same for tier round and whitelist round.

  This is a critical issue, and one user can fund much amount, receive all tokens after IDO, and sell all of them.
  IDO is to distribute tokens to as many as possible users, not certain rich members.

# Logic Issues

## IDO.sol

- setStartTime, it should update \_tierFundTime and \_whitelistedFundTime

# Practical Issues

## Point.sol

- Line 74: Better to do like this:

```
  ...external view onlyIndex(index) returns (TokenInfo memory) {
  return _tokenInfos[index];
  }
```

- Line 74, Line 88: better to use memory, not storage

## IDOFactory.sol

- Line 88,
  It's better to add the address of newly created IDO to event.

## IDO.sol

- Line 290. you defined string to log userRole. Working with string is not good. Better to define enum and log it. (string operation spend more gas)

- Line 286, fund function. Instead of receiving funder as parameter, better to use msg.sender as funder. If some user take mistake(copy and paste wrong address to funder parameter), they can lose their fund.

# Common Practical Issues

- when you remove an element from array, you did like that.

  ```
  TierList storage t = _tiers[index];
  isTierAdded[t.tierName] = false;
  t = _tiers[_tiers.length - 1];
  ```

  if should do like this for low gas:

  ```
  if (index < _tiers.length - 1) {
  t = _tiers[_tiers.length - 1];
  }
  ```

- Finalize function is called through IDOFactory, and it's a bit bad.
  Better to have this function directly on IDO contract only. If admin input wrong index and call finalize, something bad will happen.

# Unit-Testing

- Define types library and write more clear types, not just type `Contract`

# You defined IDOProperty structure and used. Good!!!
