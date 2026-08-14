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

    printf("===== MENU BAI TAP =====\n");
    printf("1. Bai 1 - Kiem tra xau Palindrome\n");
    printf("2. Bai 2\n");
    printf("=========================\n");
    printf("Chon bai: ");
    scanf("%d", &choice);
    getchar(); 

    switch (choice) {
        case 1:
            printf("Nhap xau can kiem tra: ");
            fgets(str, sizeof(str), stdin);
            str[strcspn(str, "\n")] = '\0'; 

            if (isPalindrome(str))
                printf("Xau \"%s\" la Palindrome.\n", str);
            else
                printf("Xau \"%s\" khong la Palindrome.\n", str);
            break;

        case 2:
            printf("Chua co noi dung bai 2.\n");
            break;

        default:
            printf("Lua chon khong hop le.\n");
            break;
    }

    return 0;
}
