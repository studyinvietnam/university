#include"stdio.h"
#include"stdlib.h"
struct sinhvien{
	char ten[50];
	int msv;
	float diem;
	char truong;
};
void nhap(sv a[],int *n){
	scanf("%d",n);
	for(int i=0;i<n;i++){
		scanf(" %[^\n]",a[i].ten);
		scanf("%d,%f",&a[i].msv,&a[i].diem);
		scanf("%s",&a[i].truong);
	}
}
int main(){
	struct sinhvien a[100];
	int n;
	nhap(&n,sv);
}