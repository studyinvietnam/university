#include<bits/stdc++.h>

using namespace std;

class HCN {
	private:
		float cd;
		float cr;
	public:
		HCN(){
		    cd = 0;
		    cr = 0;
		}
		HCN(float cd, float cr){
		    this->cd = cd;
		    this->cr = cr;
		}
		float getCd() {
		    return this->cd;
		}
		
		float getCr() {
		    return this->cr;
		}
//		// ****Nhập Phương thức****
//		void nhap(){
//			cout << "Nhap HCN: ";
//			cin>>cd>>cr;
//		}
		// ****Nhập Chồng toán tử****
		friend istream &operator >>(istream &is, HCN &hcn){
			cout << "Nhap HCN: ";
			is>>hcn.cd>>hcn.cr;
			return is;
		}
//		//****Xuất Phương thức****
//		void xuat(){
//			cout<< "cd: " << cd << ", cr: " << cr;
//		}
		// ****Xuất Chồng toán tử****
		friend ostream& operator <<(ostream &os, HCN hcn) {
		    os << "cd: " << hcn.cd << ", cr: " << hcn.cr;
		    return os;
		}
};

int main(){
	int n;
	HCN *hcn;
	cout<<"Nhap n HCN: ";
	cin >> n;
	hcn = new HCN[n+1];
	for(int i = 0; i < n; i++){
		// ****Nhập Phương thức****
//		hcn[i].nhap();
		// ****Nhập Chồng toán tử****
		cin >> hcn[i];
	}
	for(int i = 0; i < n; i++){
		// ****Xuất Phương thức****
//		hcn[i].xuat();
		// ****Xuất Chồng toán tử****
		cout << hcn[i];
		cout << "\nDT: " << hcn[i].getCd() * hcn[i].getCr();
	}
	
}