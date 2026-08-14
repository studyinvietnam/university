#include <stdio.h>
#include <string.h>

int main () {
	char s[100];
	int i, count = 0, cap = 0;
	printf("Nhap xau: ");
	scanf("%s", s);
	for (i = 0; i < strlen(s); i++) {
		if (s[i] == '(') {
			count++;
		} else if (s[i] == ')') {
			if (count > 0) {
				count--;
				cap++;
			}
		}
	}
	printf("So cap ngoac hop le: %d\n", cap);
	return 0;
}