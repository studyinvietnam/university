#include <stdio.h>

int main() {
    int a, b, c;
    printf("Nhap 3 so a, b, c: ");
    scanf("%d %d %d", &a, &b, &c);
    
    int max1, max2;
    if (a >= b && a >= c){
    	max1 = a;
    	max2 = (b >= c) ? b : c;
	}
	else if(b >= a && b >= c){
		max1 = b;
		max2 = (a >= c) ? a : c;
	}
	else {
		max1 = c;
		max2 = (a >= b) ? a : b;
	}
    
    printf("So lon thu 2 trong 3 so la: %d", max2);
    
    return 0;
}
