#include <stdio.h>
#include <math.h>

typedef struct{
	float x, y;
	float khoangcach;
} Diem;

int main() {
	int n;
	FILE *f = fopen ("D:\\bai tap dh\\thuc-hanh-lop\\file-cpp\\26.12.2025\\de-4\\matphang.inp", "r");
	if (f == NULL) {
		printf("Loi file matphang.inp\n");
		return 1;
	}
	fscanf(f, "%d", &n);
	int i;
	Diem d[50];
	for(int i = 0; i < n; i++) {
		fscanf(f, "%f %f\n", &d[i].x, &d[i].y);
		d[i].khoangcach = fabs(d[i].x + d[i].y);
	}
	fclose(f);
	for (int i = 0; i < n - 1; i++) {
		for (int j = i + 1;j < n; j++) {
			if (d[i].khoangcach<d[j].khoangcach){
				Diem temp = d[i];
				d[i] = d[j];
				d[j] = temp;
			}
		}
	}
	printf("3 diem co khoang cach |x+y| cao nhat\n");
	for (int i = 0; i < 3; i++) {
	printf("Diem: (%.lf, %.lf) | Khoang cach: %.lf\n", d[i].x, d[i].y, d[i].khoangcach);
	}
	return 0;
}