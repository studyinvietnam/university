#include <stdio.h>
#include <string.h>

int main () {
	char s[100];
	int i, count = 0;
	printf("Nhap xau: ");
	fgets(s, sizeof(s), stdin);
	for (i = 0; i < strlen(s); i++) {
		if (s[i] == '(') {
			count++; 
		}
		else if (s[i] == ')') {
			count--;
		}
		if (count < 0) {
			printf("No\n");
			return 0;
		}
	}
    if (count == 0) {
        printf("Yes\n");
    } else {
        printf("No\n");
    }
		return 0;
}
