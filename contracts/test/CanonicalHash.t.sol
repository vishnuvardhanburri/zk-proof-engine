// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";

/// @title CanonicalHash — cross-language anchor regression (Solidity side)
/// @notice Pins chain-side `keccak256(abi.encode(publicInputs))` to
///         `test/fixtures/canonical-vectors.json`, the single source of
///         truth generated from Solidity's own abi.encode. TypeScript side
///         (`packages/proof-format/test/abi.test.ts`) asserts the SAME file;
///         any divergence between the languages fails one of the two suites.
/// @dev Regenerate the spec: forge test --match-contract CanonicalVectorsGen -vvvv
contract CanonicalHashTest is Test {
    string constant SPEC = "test/fixtures/canonical-vectors.json";

    function testCanonicalAnchorsMatchSolidityAbi() public {
        string memory raw = vm.readFile(SPEC);
        for (uint256 i = 0; i < 5; i++) {
            string memory pre = string.concat("$.vectors[", vm.toString(i), "]");
            uint256[] memory values = vm.parseJsonUintArray(raw, string.concat(pre, ".values"));
            bytes32 expected = vm.parseJsonBytes32(raw, string.concat(pre, ".hash"));
            assertEq(
                keccak256(abi.encode(values)),
                expected,
                string.concat("canonical anchor mismatch at vector ", vm.toString(i))
            );
        }
    }

    function testSpecIsWellFormed() public {
        string memory raw = vm.readFile(SPEC);
        uint256[] memory n = vm.parseJsonUintArray(raw, "$.vectors[4].values");
        assertEq(n.length, 2, "spec vector 4 must be the 2-element pair");
        assertEq(
            keccak256(abi.encode(n)),
            0x9f6376d7a93614c6c3d937639f6989d87eea64bd1d049e4b442da29aba51a732
        );
    }
}
