#include<bits/stdc++>

using namespace std;

class PhanSo{
	private:
		int tuso;
		int mauso;
	public:
		PS(){
			tuso = 0;
			mauso = 1;
		}
		PS(){
			this->tuso = tuso;
			this->mauso = mauso;
		}
		void nhap(){
			cout<<endl<<"Nhap phan so: ";
			cin>>tuso>>mauso;
		}
		void xuat(){
			cout<<endl<<tuso<<"/"<<mauso;
		}
};

PhanSo tong(PS ps1, PS ps2){
	
}

int main(){
	PS ps1(5, 7);
	PS ps2;
	ps1.xuat();
	ps2.nhap();
	ps2.xuat();
	
}