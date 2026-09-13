#include<bits/stdc++.h>

using namespace std;

struct ThiSinh{
	string HVT;
	double diemtoan, diemli, diemhoa;
};

double tongdiem(ThiSinh ts){
	return ts.diemtoan + ts.diemli + ts.diemhoa;
}

void giamdan(int n, ThiSinh ts[]){
	for(int i = 0; i < n - 1; i++){
		for(int j = i + 1; j < n; j++){
			if(tongdiem(ts[i]) < tongdiem(ts[j])){
				ThiSinh temp = ts[i];
				ts[i] = ts[j];
				ts[j] = temp;
			}
		}
	}
	cout << "Danh sach thi sinh theo tong diem giam dan: ";
	for(int i = 0; i < n; i++){
    	cout << "\nThi sinh " << i + 1 << ": ";
    	cout << "\nHo va ten: " << ts[i].HVT;
    	cout << "\nDiem Toan: " << ts[i].diemtoan;
    	cout << "\nDiem Li: " << ts[i].diemli;
    	cout << "\nDiem Hoa: " << ts[i].diemhoa;
    	cout << "\nTong diem: " << tongdiem(ts[i]) << endl;
	}
}

int main(){
	int n;
	cout << "Nhap n: "; cin >> n;
	cin.ignore(numeric_limits<streamsize>::max(), '\n');
	ThiSinh ts[n];
	for(int i = 0; i < n; i++){
		cout << "Nhap ho va ten cho thi sinh thu " << i+1 << ": ";
		getline(cin, ts[i].HVT);
		cout << "Nhap diem toan cho thi sinh " << ts[i].HVT << ": ";
		cin >> ts[i].diemtoan;
		cout << "Nhap diem li cho thi sinh " << ts[i].HVT << ": ";
		cin >> ts[i].diemli;
		cout << "Nhap diem hoa cho thi sinh " << ts[i].HVT << ": ";
		cin >> ts[i].diemhoa;
		cin.ignore(numeric_limits<streamsize>::max(), '\n');
	}
	return 0;
}