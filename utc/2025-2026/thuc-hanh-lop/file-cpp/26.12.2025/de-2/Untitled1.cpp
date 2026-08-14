#include <stdio.h>
#include <string.h>

typedef struct {
char hoten [100];
float van, su, dia;
float tbc ;
} HocSinh;

int main() {
	FILE *f = fopen ("D:\\bai tap dh\\thuc-hanh-lop\\file-cpp\\26.12.2025\\de-2\\hocsinh.txt", "r");
	if (f == NULL) {
		printf("Khong mo duoc file hocsinh.txt!\n");
		return 1;
		// int main => return 1;
		// void => return;
	}
	int n;
	fscanf (f, "%d\n", &n);
	HocSinh hs[n];
	for (int i = 0; i < n; i++) {
	fgets (hs[i].hoten , 100 , f);
	hs[i].hoten [strcspn (hs[i].hoten, "\n")] = 0;
	fscanf (f, "%f %f %f\n", &hs[i].van, &hs[i].su, &hs[i].dia);
	hs[i].tbc = (hs[i].van + hs[i].su + hs[i].dia) / 3;
	}
	fclose (f);
	for (int i = 0; i < n - 1; i++) {
        for (int j = i + 1; j < n; j++) {
            if (hs[i].tbc < hs[j].tbc) {
                HocSinh temp = hs[i];
                hs[i] = hs[j];
                hs[j] = temp;
            }
        }
    }
	printf("---5 thi sinh co diem trung binh cong cao nhat---\n");
	for (int i = 0; i < 5 && i < n; i++) {
		printf("Ho ten: %s | Van: %.1f | Su: %.1f | Dia: %.1f | TBC: %.1f\n", hs[i].hoten, hs[i].van, hs[i].su, hs[i].dia, hs[i].tbc);
	}
	return 0;
}