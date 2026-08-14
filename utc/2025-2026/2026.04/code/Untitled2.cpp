#include<stdio.h>
#include <string.h>

typedef struct{
	char ma_sp[100];
	char ten_sp[100];
	int gia;
} SanPham;

int main() {
	SanPham sp[2];
	FILE *fp;
	// FILE la mot kieu du lieu (struct) duoc dinh nghia san trong thu vien <stdio.h>
	// *fp nghia la con tro toi FILE.
	for(int i = 0; i < 2; i++) {
		printf("Nhap thong tin san pham thu %d:\n", i+1);
		printf("Ma san pham: ");
		fgets(sp[i].ma_sp, sizeof(sp[i].ma_sp), stdin);
		// stdin la viet tat c?a standard input (luong nhap chuan)
		// fgets la ham dung de doc mot chuoi (string) tu: ban phim (stdin) hoac tu file
		// sizeof la toan tu trong C/C++ dung de lay kich thuoc (so byte) cua mot bien hoac kieu du lieu.
		sp[i].ma_sp[strcspn(sp[i].ma_sp, "\n")] = '\0'; // looi bo ky tu '\n'
		printf("Ten san pham: ");
		fgets(sp[i].ten_sp, sizeof(sp[i].ten_sp), stdin);
		sp[i].ten_sp[strcspn(sp[i].ten_sp, "\n")] = '\0';
		printf("Gia: ");
		scanf("%d", &sp[i].gia);
		getchar(); // loai bo ky tu '\n' con lai sau scanf
	}
	// Ghi 2 san pham vao file nhi phan
	fp = fopen("products.dat", "wb");
	if (fp == NULL) {
        printf("Khong the mo file de ghi!\n");
        return 1;
    }
    fwrite(sp, sizeof(SanPham), 2, fp); //fwrite(du_lieu, kich_thuoc, so_luong, file);
    fclose(fp);
    // Doc lai file nhi phan
    SanPham sp_read[2];
    fp = fopen("products.dat", "rb");
    if (fp == NULL) {
        printf("Khong the mo file de doc!\n");
        return 1;
    }
    fread(sp_read, sizeof(SanPham), 2, fp);
    fclose(fp);
    // In thong tin san pham ra man hinh
    printf("\nThong tin san pham doc tu file:\n");
    for(int i = 0; i < 2; i++) {
        printf("San pham thu %d:\n", i+1);
        printf("Ma SP: %s\n", sp_read[i].ma_sp);
        printf("Ten SP: %s\n", sp_read[i].ten_sp);
        printf("Gia: %d\n", sp_read[i].gia);
    }
	return 0;
}