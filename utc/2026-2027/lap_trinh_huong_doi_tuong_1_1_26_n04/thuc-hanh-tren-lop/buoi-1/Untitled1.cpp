#include<bits/stdc++.h>

using namespace std;

class HCN{
	private:
		int canhdai;
		int canhrong; 
	public: 
	    HCN() {
	        canhdai = 0;
	        canhrong = 0;
	    }
	    void nhap(){
	        cout << endl << "Nhap canh dai, canh rong: ";
	        cin >> canhdai >> canhrong;
		} 
	    void xuat() {
	        for (int i = 1; i <= canhrong; i++) {
	            for (int j = 1; j <= canhdai; j++) {
	                cout << "*";
	            }
	            cout << endl;
	        }
	    }
	    int dientichhcn() {
		    return canhdai * canhrong;
		}

}; 

void nhapNhieuHCN(HCN hcn[], int n) {
    for (int i = 0; i < n; i++) {
        cout << endl << "Hinh chu nhat thu " << i + 1 << ":\n";
        hcn[i].nhap();
    }
}

void xuatNhieuHCN(HCN hcn[], int n) {
    for (int i = 0; i < n; i++) {
        cout << endl << "Hinh chu nhat thu " << i + 1 << ":\n";
        hcn[i].xuat();
    }
}

void dienTichTBNhieuHCN(HCN hcn[], int n) {
    int tong = 0;
    for (int i = 0; i < n; i++) {
        tong += hcn[i].dientichhcn();
    }
    int trungbinh = tong / n;
    cout << "Dien tich trung binh = " << trungbinh << endl;
}

void soSanhHCN(HCN hcn[], int n) {
    int dienTich[100];
    for (int i = 0; i < n; i++) {
        dienTich[i] = hcn[i].dientichhcn();
    }
    int dienTichMin = dienTich[0];
    int vitriMin = 0; 
    for (int i = 0; i < n; i++) {
        if (dienTichMin > dienTich[i]) {
            dienTichMin = dienTich[i];
            vitriMin = i;
        }
    }
    cout << "Dien tich nho nhat = " << dienTichMin << endl;
    cout << endl << "Hinh chu nhat co dien tich nho nhat:" << endl;
    hcn[vitriMin].xuat();
}


int main() {
    int n;
    cout << "Nhap so luong hinh chu nhat: ";
    cin >> n;
    HCN hcn[100];
    nhapNhieuHCN(hcn, n);
    xuatNhieuHCN(hcn, n);
    dienTichTBNhieuHCN(hcn, n);
    soSanhHCN(hcn, n);
    return 0;
}


