#include <stdio.h>
#include <string.h>

	char stack[100];
	int top = -1;
	void push(char c) {
		stack[++top] = c;
	}
	char pop () {
	return (top == -1) ? '\0' : stack[top--];
	}


int main () {
	char s[100];
	int i;
	printf ("Nhap xau: ");
	scanf("%s", s);
	for (i = 0; i < strlen(s); i++) {
		char c = s[i];
		if (c == '(' || c == '[' || c == '{') {
			push(c);
		}
		else if (c == ')' || c == ']' || c == '}') {
			char t = pop();
			if (t == '\0') {
    			printf("No\n");
    			return 0;
			}
			if ((c == ')' && t != '(') ||
    			(c == ']' && t != '[') ||
    			(c == '}' && t != '{'))
		 		{
			printf("No\n");
			return 0;
			}
		}
	}
	if (top == -1)
		printf("Yes\n");
	else
		printf("No\n");
	return 0;
}