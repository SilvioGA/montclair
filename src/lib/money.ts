export function money(n: number) {
  return `C$ ${n.toLocaleString("es-NI")}`;
}

export function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}
