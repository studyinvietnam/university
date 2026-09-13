#include<bits/stdc++.h>

using namespace std;

struct MatHang{
	char MH[100];
	int DG, SL;
	char NB[100];
};


void dem(int m, MatHang mh[]){
	int demlon = 0;
	for(int i = 0; i < m; i++){
		if (mh[i].SL > 10){
			demlon++;
		}
	}
	cout << "So mat hang co so luong lon hon 10 la: " << demlon << endl;
}

void ngayxd(int m, MatHang mh[]){
	int demtien = 0;
	char xd[100];
	cout << "Nhap ngay ban: "; cin.getline(xd, 100);
    for(int i = 0; i < m; i++){
    	if(strcmp(xd, mh[i].NB) == 0){
    		demtien += mh[i].DG * mh[i].SL;
		}
	}
	cout << "So tien ban duoc trong ngay " << xd << " la: " << demtien << endl;
}


int main(){
	int m; 
	cout << "Nhap m mat hang: "; cin >> m; 
	cin.ignore();
	MatHang mh[m];
	for(int i = 0; i < m; i++){
		cout << endl << "-- Nhap san pham thu " << i+1 << "--" << endl; 
		cout << "Mat hang: "; cin.getline(mh[i].MH, 100);
		cout << "Don gia: "; cin >> mh[i].DG;
		cout << "So luong: "; cin >> mh[i].SL;
        cin.ignore();
		cout << "Ngay ban: "; cin.getline(mh[i].NB, 100);
	}
	dem(m, mh);
	ngayxd(m, mh);
	return 0;
}