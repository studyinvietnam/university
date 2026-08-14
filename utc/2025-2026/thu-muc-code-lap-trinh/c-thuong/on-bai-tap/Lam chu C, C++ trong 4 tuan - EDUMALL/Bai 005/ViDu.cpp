#include <stdio.h>

int a=10,b=5;
const float Pi=3.14;

int Cong () {
	int kq=a+b;
	return kq;
}


int main () {
	printf("Ket qua cong: %d\n", Cong());
	printf("Ket qua Pi: %f\n", Pi);
}