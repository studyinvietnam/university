#include <stdio.h>

int main() {
	int arr[] = {1, 2, 3, 4, 5};
	int n = sizeof(arr)/sizeof(arr[0]);
	// sizeof(arr) -> lay tong so byte cua toan bo mang arr
	// sizeof(arr[0]) -> lay so byte cua 1 phan tu
	int sum_product=0;
	int sum_odd=0; // odd: so le (even: so chan)
	int i;
	for (i=0; i<n-1; i++) {
		sum_product += arr[i] * arr[i+2];
	}
	for (i=0; i<n; i++) {
		if (arr[i] % 2 != 0) {
			sum_odd += arr[i]; 
		}
	}
	double S = (double)sum_product / sum_odd;
	printf("Tu so (tong cac san pham): %d\n", sum_product);
	printf("Mau so (tong cac so le): %d\n", sum_odd);
	printf("Ket qua (S): %.2f\n", S);
	return 0;
}
