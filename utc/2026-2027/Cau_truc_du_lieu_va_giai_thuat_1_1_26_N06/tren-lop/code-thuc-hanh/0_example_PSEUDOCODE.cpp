#include<bits/stdc++.h>

using namespace std;
using ll = long long;

/*
MÃ GIẢ (PSEUDOCODE)
    INPUT a, b (double)
    OUTPUT x (double hoặc thông báo)
    BEGIN
        PRINT "Nhập vào 2 số thực a, b:"
        READ a, b
        
        IF a == 0 THEN
            IF b == 0 THEN
                PRINT "Phương trình bậc nhất có vô số nghiệm"
            ELSE
                PRINT "Phương trình bậc nhất vô nghiệm"
            ENDIF
        ELSE
            DOUBLE x = -b / a
            PRINT "Phương trình có nghiệm x = ", x
        ENDIF
    END
*/

int main(){
	double a, b;
	cout << "Nhap vao 2 so thuc a, b: ";
	cin >> a >> b;
	cout << endl;
	if(a == 0){
		if(b == 0){
			cout << "Phuong trinh bac nhat co vo so nghiem" << endl;
		}
		else{
			cout << "Phuong trinh bac nhat vo nghiem" << endl;
		}
	}
	else{
		double x = -b / a;
		cout << fixed << setprecision(2) << "Phuong trinh bac nhat co nghiem x = " << x << endl;
	}
	return 0;
}