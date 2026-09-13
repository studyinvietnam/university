#include <bits/stdc++.h>

using namespace std;

class SinhVien{
	private:
		int ma;
		string ten;
		float diem;
	public:
		void nhap(){
			cout<<"Nhap ma: ";
			cin>>this->ma;
			cout<<"Nhap ten: ";
			cin.ignore();
			getline(cin, this->ten);
			cout<<"Nhap diem: ";
			cin>>this->diem;
		}
		void xuat(){
			cout<<endl<<ma<<" "<<ten<<" "<<diem;
		}
		float getDiem(){
			return this->diem;
		}
		void setDiem(float diem){
			this->diem = diem;
		}
};

int main(){
	SinhVien sv1, sv2;
	sv1.nhap();
	sv1.xuat();
	sv2.nhap();
	sv2.xuat();
	if(sv1.getDiem() > sv2.getDiem()){
		
	}
	sv2.setDiem(sv2.getDiem() + 1);
}