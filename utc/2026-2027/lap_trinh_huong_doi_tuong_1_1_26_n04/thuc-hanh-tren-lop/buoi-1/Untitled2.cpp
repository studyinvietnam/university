#include<bits/stdc++.h>

using namespace std;

class soPhuc{
	private:
		int phanThuc;
		int phanAo; 
	public: 
	    soPhuc() {
	        phanThuc = 0;
	        phanAo = 0;
	    }
	    soPhuc(int a, int b) {
	        this->phanThuc = a;
	        this->phanAo = b;
	    }
	    void nhap(){
	        cout << "Nhap phan thuc, phan ao: ";
	        cin >> phanThuc >> phanAo;
		} 
		void xuat() {
		    cout << "z = " << phanThuc;
		    if (phanAo >= 0)
		        cout << " + " << phanAo << "i";
		    else
		        cout << " - " << -phanAo << "i";
		    cout << endl;
		}
	    int getPT() {
	        return phanThuc;
	    }
	    int getPA() {
	        return phanAo;
	    }
	    double module(){
	    	return sqrt(phanThuc * phanThuc + phanAo * phanAo);
		} 
}; 


soPhuc congSoPhuc(soPhuc sp1, soPhuc sp2) {
    int pThuc = sp1.getPT() + sp2.getPT();
    int pAo = sp1.getPA() + sp2.getPA();
    return soPhuc(pThuc, pAo);
}

soPhuc soSanhModule(soPhuc sp1, soPhuc sp2) {
    if (sp1.module() > sp2.module()) {
        return sp1;
    }
    else {
        return sp2;
    }
}



int main(){
	soPhuc sp1(1, 2);
    soPhuc sp2;
    cout << "Nhap So phuc 2: " << endl;
    sp2.nhap();
    cout << endl;
    cout << "=> So phuc 1 = ";
    sp1.xuat(); 
    cout << endl;
    cout << "=> So phuc 2 = ";
    sp2.xuat(); 
    cout << endl;
    cout << endl;
	soPhuc sp3 = congSoPhuc(sp1, sp2); 
	cout << "=> Tong so phuc 1 va 2 = ";
	sp3.xuat();
	cout << endl;
    soPhuc sp4 = soSanhModule(sp1, sp2);
    cout << endl << "So phuc co module lon hon = ";
    sp4.xuat();
    return 0; 
} 
