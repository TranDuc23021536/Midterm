    const { ethers } = require("hardhat");
     
    async function main() {
      // --- CẤU HÌNH ---
      // Đảm bảo thay ĐÚNG địa chỉ token của bạn
      const TOKEN_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"; 
     
      // Số lượng MTK Spender muốn chuyển (ví dụ: 10 MTK)
      const AMOUNT_TO_TRANSFER = "10"; 
      // ------------------
     
      // 1. Lấy danh sách tài khoản
      // Owner (Account #0), Spender (Account #1), Recipient (Account #2)
      const [owner, spender, recipient] = await ethers.getSigners();
     
      console.log(`Owner (Chủ token):     ${owner.address}`);
      console.log(`Spender (Được approve): ${spender.address}`);
      console.log(`Recipient (Người nhận):  ${recipient.address}`);
      console.log("---");
     
      // 2. Kết nối vào contract
      const MyToken = await ethers.getContractFactory("MyToken");
     
      // 3. Quan trọng: Kết nối với tư cách là Spender (Account #1)
      const token = MyToken.attach(TOKEN_ADDRESS).connect(spender);
     
      const amountWei = ethers.parseUnits(AMOUNT_TO_TRANSFER, 18);
     
      // 4. Kiểm tra allowance trước khi chuyển
      const allowance = await token.allowance(owner.address, spender.address);
      console.log(`Spender được phép tiêu: ${ethers.formatUnits(allowance, 18)} MTK`);
     
      if (allowance < amountWei) {
        console.error("Lỗi: Spender không có đủ allowance để thực hiện giao dịch.");
        return;
      }
     
      // 5. Spender gọi hàm transferFrom
      console.log(`Spender đang gọi transferFrom để chuyển ${AMOUNT_TO_TRANSFER} MTK...`);
      const tx = await token.transferFrom(
        owner.address,      // from
        recipient.address,  // to
        amountWei           // amount
      );
     
      await tx.wait();
      console.log("✅ Giao dịch transferFrom thành công!");
     
      // 6. Kiểm tra lại kết quả
      const ownerBalance = await token.balanceOf(owner.address);
      const recipientBalance = await token.balanceOf(recipient.address);
      const remainingAllowance = await token.allowance(owner.address, spender.address);
     
      console.log(`Số dư mới của Owner:     ${ethers.formatUnits(ownerBalance, 18)} MTK`);
      console.log(`Số dư mới của Recipient: ${ethers.formatUnits(recipientBalance, 18)} MTK`);
      console.log(`Allowance còn lại:       ${ethers.formatUnits(remainingAllowance, 18)} MTK`);
    }
     
    main().catch((e) => {
      console.error(e);
      process.exit(1);
    });