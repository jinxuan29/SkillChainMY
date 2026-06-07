import { expect } from "chai";
import hre from "hardhat";

const { ethers, networkHelpers } = await hre.network.create();

describe("SkillChainMY", function () {
    let skillChain: any;

    let admin: any;
    let issuer: any;
    let student: any;
    let recruiter: any;
    let randomUser: any;

    beforeEach(async function () {
        [admin, issuer, student, recruiter, randomUser] =
            await ethers.getSigners();

        const SkillChainFactory =
            await ethers.getContractFactory("SkillChainMY");

        skillChain = await SkillChainFactory.deploy();

        await skillChain.waitForDeployment();
    });

    // =====================================================
    // DEPLOYMENT
    // =====================================================

    describe("Deployment", function () {

        it("Should assign DEFAULT_ADMIN_ROLE to deployer", async function () {
            const role = await skillChain.DEFAULT_ADMIN_ROLE();

            expect(
                await skillChain.hasRole(
                    role,
                    await admin.getAddress()
                )
            ).to.equal(true);
        });

        it("Should initialize token name correctly", async function () {
            expect(await skillChain.name())
                .to.equal("SkillChain Portfolio");
        });

        it("Should initialize token symbol correctly", async function () {
            expect(await skillChain.symbol())
                .to.equal("SKILL");
        });
    });

    // =====================================================
    // ISSUER MANAGEMENT
    // =====================================================

    describe("Issuer Management", function () {

        it("Admin can add issuer", async function () {

            await skillChain.addIssuer(
                await issuer.getAddress()
            );

            const role = await skillChain.ISSUER_ROLE();

            expect(
                await skillChain.hasRole(
                    role,
                    await issuer.getAddress()
                )
            ).to.equal(true);
        });

        it("Non-admin cannot add issuer", async function () {

            await expect(
                skillChain
                    .connect(randomUser)
                    .addIssuer(await issuer.getAddress())
            ).to.be.revertedWithCustomError(skillChain, "AccessControlUnauthorizedAccount");
        });

    });

    // =====================================================
    // ISSUE CREDENTIAL
    // =====================================================

    describe("Issue Credential", function () {

        beforeEach(async function () {
            await skillChain.addIssuer(
                await issuer.getAddress()
            );
        });

        it("Issuer can issue credential", async function () {

            await skillChain
                .connect(issuer)
                .issueCredential(
                    await student.getAddress(),
                    "QmCID123"
                );

            expect(
                await skillChain.ownerOf(0)
            ).to.equal(
                await student.getAddress()
            );
        });

        it("Credential data stored correctly", async function () {

            await skillChain
                .connect(issuer)
                .issueCredential(
                    await student.getAddress(),
                    "QmCID123"
                );

            const credential =
                await skillChain.credentials(0);

            expect(credential.ipfsCID)
                .to.equal("QmCID123");

            expect(credential.issuer)
                .to.equal(
                    await issuer.getAddress()
                );
        });

        it("Non-issuer cannot issue credential", async function () {

            await expect(
                skillChain
                    .connect(randomUser)
                    .issueCredential(
                        await student.getAddress(),
                        "QmCID123"
                    )
            ).to.be.revertedWithCustomError(skillChain, "AccessControlUnauthorizedAccount");
        });

        // REQUIRE TEST 1
        it("Should revert when issuing to zero address", async function () {

            await expect(
                skillChain
                    .connect(issuer)
                    .issueCredential(
                        ethers.ZeroAddress,
                        "QmCID123"
                    )
            ).to.be.revertedWith(
                "Cannot issue to zero address"
            );
        });

        it("Should handle duplicate entries (allow student to hold multiple credentials)", async function () {
            // Issue first credential
            await skillChain.connect(issuer).issueCredential(await student.getAddress(), "QmCID_First");
            
            // Issue second (duplicate) credential to the same student
            await skillChain.connect(issuer).issueCredential(await student.getAddress(), "QmCID_Second");

            // Verify student balance is 2
            expect(await skillChain.balanceOf(await student.getAddress())).to.equal(2);

            // Verify the second token has the correct data
            const credential = await skillChain.credentials(1); // Token ID 1
            expect(credential.ipfsCID).to.equal("QmCID_Second");
        });

        // REQUIRE TEST 2
        it("Should revert when CID is empty", async function () {

            await expect(
                skillChain
                    .connect(issuer)
                    .issueCredential(
                        await student.getAddress(),
                        ""
                    )
            ).to.be.revertedWith(
                "IPFS CID cannot be empty"
            );
        });

    });

    // =====================================================
    // RECRUITER ACCESS
    // =====================================================

    describe("Recruiter Access", function () {

        it("Student can grant recruiter access", async function () {

            const hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("secret")
                );

            await skillChain
                .connect(student)
                .grantRecruiterAccess(
                    hash,
                    7
                );

            expect(
                await skillChain.verifyRecruiterAccess(
                    await student.getAddress(),
                    hash
                )
            ).to.equal(true);
        });

        // REQUIRE TEST 3
        it("Should revert if duration is zero", async function () {

            const hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("secret")
                );

            await expect(
                skillChain
                    .connect(student)
                    .grantRecruiterAccess(
                        hash,
                        0
                    )
            ).to.be.revertedWith(
                "Duration must be > 0"
            );
        });

        it("Invalid hash should return false", async function () {

            const hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("secret")
                );

            const wrongHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("wrong")
                );

            await skillChain
                .connect(student)
                .grantRecruiterAccess(
                    hash,
                    7
                );

            expect(
                await skillChain.verifyRecruiterAccess(
                    await student.getAddress(),
                    wrongHash
                )
            ).to.equal(false);
        });

    });

    // =====================================================
    // SOULBOUND TOKEN
    // =====================================================

    describe("Soulbound Behaviour", function () {

        beforeEach(async function () {

            await skillChain.addIssuer(
                await issuer.getAddress()
            );

            await skillChain
                .connect(issuer)
                .issueCredential(
                    await student.getAddress(),
                    "QmCID123"
                );
        });

        it("Should prevent transfer", async function () {

            await expect(
                skillChain
                    .connect(student)
                    .transferFrom(
                        await student.getAddress(),
                        await recruiter.getAddress(),
                        0
                    )
            ).to.be.revertedWith(
                "SkillChainMY: Credentials are Soulbound and cannot be transferred"
            );
        });

    });

    // =====================================================
    // STRESS / INTEGRATION
    // =====================================================

    describe("Multiple User Interaction", function () {

        it("Should issue multiple credentials to different students", async function () {

            const { ethers } =
                await hre.network.create();

            const signers =
                await ethers.getSigners();

            await skillChain.addIssuer(
                await issuer.getAddress()
            );

            for (let i = 1; i <= 5; i++) {

                await skillChain
                    .connect(issuer)
                    .issueCredential(
                        await signers[i].getAddress(),
                        `CID${i}`
                    );
            }

            expect(
                await skillChain.ownerOf(4)
            ).to.equal(
                await signers[5].getAddress()
            );
        });

    });
});