#include<stdio.h>
#include<string.h>
#include<stdlib.h>
typedef struct SinhVien{
	int ma;
	char ten[50];
	float diem;
	char truong;
};
// nhap
void nhap(int n, SinhVien *sv){
	for(int i=0; i<n; i++){
		fgets(sv[i].ten,sizeof(sv[i].ten),stdin);
		sv[i].ten[strcspn(sv[i].ten,"\n")]='\0';
		scanf("%d",&sv[i].ma);
		getchar();
		scanf("%f",&sv[i].diem);
		getchar();
		scanf("%c",&sv[i].truong);
		getchar();
	}
}
void xuat(int n,SinhVien *sv){
	for(int i=0;i<n;i++){
		printf("%s || %d || %.2f || %c\n",sv[i].ten,sv[i].ma,sv[i].diem,sv[i].truong);
	}
}

int demTruong(int n, SinhVien *sv, char truong){
	int dem = 0;
	for(int i=0; i<n; i++){
		if(sv[i].truong == truong)
			dem ++;
	}
	return dem;
}
//void thongke(int n, SinhVien *ds){
//	int svA =0, svb=0, svc=0;
//	for(int i =0; i < n; i++){
//	 	if(ds[i].truong == 'A'){
//	 		sva++;
//		 }
//	 	else if(ds[i].truong == 'B'){
//	 		svb++;
//		 }
//		else {
//			svc++;
//		}
//	}
//	printf("Hs truong A/B/C: %d / %d / %d",sva,svb,svc ); 
//	if (sva > svb && sva > svc){
//		printf("truong nhieu sinh vien nhat la:A");
//	}
//	if (svb > sva && svb > svc){
//		printf("truong nhieu sinh vien nhat la:B");
//	}
//	if (svc > svb && svc > sva){
//		printf("truong nhieu sinh vien nhat la:");
//	}
//	
//}
void truot(int n, SinhVien *sv, float dc, SinhVien *&kq, int *slTruot){
	*slTruot = 0;
	for(int i=0; i<n; i++){
		if(sv[i].diem < dc){
			kq[*slTruot] = sv[i];
			(*slTruot)++;
		}
	}
}
int main(){
	
	int n;
	scanf("%d",&n);
	getchar();
	struct SinhVien sv[n];
	nhap(n,sv);
	xuat(n,sv);
	printf("\nSo sv truong A %d", demTruong(n, sv, 'A'));
	printf("\nSo sv truong B %d", demTruong(n, sv, 'B'));
	printf("\nSo sv truong C %d", demTruong(n, sv, 'C'));
	SinhVien *kq;
	kq = (SinhVien*) malloc(n * sizeof(SinhVien));
	int slTruot;
	truot(n, sv, 6, kq, &slTruot);
	printf("\ncac Sv  bi truot la: \n");
	xuat(slTruot, kq);
}
