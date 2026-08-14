#include <stdio.h>
#include <string.h>
#include <stdbool.h>


bool isPalindrome(char str[]) {
    int length = strlen(str);
    int left = 0;
    int right = length - 1;

    while (left < right) {
        if (str[left] != str[right]) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}

int main() {
    int choice;
    char str[100];

    		printf("Nhap xau can kiem tra: ");
            fgets(str, sizeof(str), stdin);
            str[strcspn(str, "\n")] = '\0'; 

            if (isPalindrome(str))
                printf("Xau \"%s\" la Palindrome.\n", str);
            else
                printf("Xau \"%s\" khong la Palindrome.\n", str);


    return 0;
}
