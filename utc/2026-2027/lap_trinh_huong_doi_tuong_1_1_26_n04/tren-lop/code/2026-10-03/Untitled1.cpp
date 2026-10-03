#include<bits/stdc++.h>

using namespace std;
using ll = long long;

class Nguoi{
	private:
		string ten;
		int namSinh;
	public:
		void nhap(){
			cout << "Nhap ten: ";
    		cin.ignore();
			getline(cin, ten);
			cout << "Nhap nam sinh: ";
			cin >> namSinh;
		}
		void xuat(){
			cout << endl << "Ten: " << ten << ", nam sinh: " << namSinh;
		}
		int getNS(){
			return namSinh;
		}
		int getTuoi(){
			return 2026 - namSinh;
		}
};

class SinhVien : public Nguoi{
	private:
		float diem;
	public:
		//override
		void nhap(){
			Nguoi::nhap();
			cout<<"Nhap diem: ";
			cin>>diem;
		}
		//override
		void xuat(){
			Nguoi::xuat();
			cout<<", diem: "<<diem;
		}
};

class NhanVien : public Nguoi{
	private:
		int luong;
	public:
		void nhap(){
			Nguoi::nhap();
			cout<<"Nhap luong: ";
			cin>>luong;
		}
		void xuat(){
			Nguoi::xuat();
			cout<<", luong: "<<luong;
		}
		
};

int main(){
	
	int m;
	cout<<"Nhap m: ";
	cin>>m;
	NhanVien *nv = new NhanVien[m];
	for(int i = 0; i < m; i++){
		nv[i].nhap();
	}
	for(int i = 0; i < m; i++){
		nv[i].xuat();
	}
	//tinh tuoi cua sinh vien vua nhap
	for(int i = 0; i < m; i++){
		cout<<"\ntuoi la: "<<nv[i].getTuoi();
	}
	cout << endl << endl;
	
	int n;
	cout<<"Nhap n: ";
	cin>>n;
	SinhVien *sv = new SinhVien[n];
	for(int i = 0; i < n; i++){
		sv[i].nhap();
	}
	for(int i = 0; i < n; i++){
		sv[i].xuat();
	}
	//tinh tuoi cua sinh vien vua nhap
	for(int i = 0; i < n; i++){
		cout<<"\ntuoi la: "<<sv[i].getTuoi();
	}
	
	
}