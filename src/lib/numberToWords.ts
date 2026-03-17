const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

function convertChunk(n: number): string {
  if (n === 0) return '';
  let s = '';
  if (n >= 100) {
    s += ones[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    s += tens[Math.floor(n / 10)] + ' ';
    n %= 10;
  } else if (n >= 10) {
    s += teens[n - 10] + ' ';
    return s.trim();
  }
  if (n > 0) s += ones[n] + ' ';
  return s.trim();
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  let result = '';

  if (intPart >= 10000000) {
    result += convertChunk(Math.floor(intPart / 10000000)) + ' Crore ';
  }
  if (intPart >= 100000) {
    result += convertChunk(Math.floor((intPart % 10000000) / 100000)) + ' Lakh ';
  }
  if (intPart >= 1000) {
    result += convertChunk(Math.floor((intPart % 100000) / 1000)) + ' Thousand ';
  }
  result += convertChunk(intPart % 1000);

  result = result.trim() || 'Zero';
  if (decPart > 0) {
    result += ' and ' + decPart + '/100';
  }
  return result + ' Only';
}
