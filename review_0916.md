# Review

## Point

- insertToken: needs a validation to check if token is already added or not
- you used mapping to handle tokenInfos, but should use array.
  No way to get tokenlist easily


## Tier

- removeTier: array operation is wrong. Please update. 
 Reference: https://solidity-by-example.org/array/
- 

## IDOFactory

- isOperator. define mapping(address=>bool) to identify operators. 

## IDO

-  Also used 8 as a constant, but it's just an example on specs. Please check specs again.
  1/3 of total IDO duration is for tier, whitelist and fcfs. Not fixed 8.
  Develop the logic again. (same as JGC, check his description)
