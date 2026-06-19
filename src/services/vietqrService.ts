type VietQRInput = {
  bankBin?: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
  amount?: number;
  description: string;
};

export function generateVietQRUrl(input: VietQRInput) {
  const bank = (input.bankBin || input.bankCode || '').trim();
  if (!bank) {
    throw new Error('Thiếu mã ngân hàng để tạo VietQR.');
  }

  const accountNumber = input.accountNumber.trim();
  const params = new URLSearchParams({
    addInfo: input.description.trim(),
    accountName: input.accountName.trim(),
  });
  if (input.amount && input.amount > 0) {
    params.set('amount', String(Math.round(input.amount)));
  }

  return `https://img.vietqr.io/image/${bank}-${accountNumber}-compact2.png?${params.toString()}`;
}

export function createTransferContent(bookingId: string, customerId: string) {
  return `BOOKING_${bookingId.slice(0, 8).toUpperCase()}_${customerId.slice(0, 8).toUpperCase()}`;
}
