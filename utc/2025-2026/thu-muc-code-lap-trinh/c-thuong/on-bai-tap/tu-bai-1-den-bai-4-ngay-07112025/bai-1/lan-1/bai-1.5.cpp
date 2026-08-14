# include <stdio.h>

int main() {
    int a, b, c;
	
	printf("Nhap 3 so a,b,c (a,b,c < 10^6): ");
	scanf("%d %d %d", &a, &b, &c);
	
	if (a % 3 == 0) {
		printf("a chia het cho 3\n");
	}
	else {
		printf("a khong chia het cho 3\n");
	}
	
	if (b % 3 == 0) {
		printf("b chia het cho 3\n");
	}
	else {
		printf("b khong chia het cho 3\n");
	}
	
	if (c % 3 == 0) {
		printf("c chia het cho 3\n");
	}
	else {
		printf("c khong chia het cho 3\n");
	}
	
	return 0;
}