#include <stdio.h>

int main () {
	unsigned pos, t;
	unsigned long sin;
	
	while (1) {
		printf("SIN (0 de thoat): ");
		scanf("%lu", &sin);
		if (sin == 0) break;
		unsigned sum = sin % 10;
		sin /= 10;
		for (pos = 0; pos < 8 && sin > 0; sin /=10, ++pos) {
			t = sin % 10;
			if (pos % 2) sum += t;
			else sum += (2*t)/10 + (2*t)%10;
		}
		if (pos >= 8 && sin <= 0 && sum % 10 == 0)
			printf("SIN hop le!\n");
		else
			printf("SIN khong hop le\n");
	}
	return 0;
}