#include <stdio.h>

int main() {
    int a, b, c;
    printf("Nhap 3 so a, b, c (a,b,c < 10^6): ");
    scanf("%d %d %d", &a, &b, &c);
    
    if (a > b) {
    	int temp = a;
    	a = b;
    	b = temp;
	}
	if (a > c) {
    	int temp = a;
    	a = c;
    	c = temp;
	}
	if (b > c) {
    	int temp = b;
    	b = c;
    	c = temp;
	}
	
	printf("3 so a, b, c theo thu tu tang dan la: %d %d %d", a, b, c);

    return 0;
}
