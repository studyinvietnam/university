#include <bits/stdc++.h>
using namespace std;
using ll = long long;




int main(){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int chon;
    cout << "Vui long chon case: " << flush;
    cin >> chon;
    cout << endl;
    switch(chon){
    	case 1:{
			/*== [Đồng dư]. Bài 1. Tổng chia dư ==*/
			// 
			// Cho N số nguyên, tính tổng các số và lấy dư cho 10^9 + 7.
			//
			// Đầu vào:
			// - Dòng 1: N là số lượng số nguyên.
			// - Dòng 2: Gồm N số nguyên, cách nhau bởi khoảng trắng.
			//
			// Giới hạn:
			// - 1 <= N <= 10^5
			// - Các số là số nguyên dương, không quá 10^16.
			//
			// Đầu ra:
			// - In ra tổng các số chia dư cho 10^9 + 7.
			//
			// Ví dụ:
			// Input:
			// 5
			// 534 7 669 826 610
			//
			// Output:
			// 2646
			freopen("Untitled6_input1.txt", "r", stdin);
			int n; cin >> n;
			int mod = 1000000007;
			ll tong = 0;
			for(int i = 0; i < n; i++){
			    ll x; cin >> x;
			    tong += x % mod;
			    tong %= mod;
			}
			cout << tong << endl;
			break;
		}
    	case 2:{
			/*== [Đồng dư]. [Đồng Dư]. Bài 2. Tích chia dư ==*/
			//
			// Cho N số nguyên, tính tích các số này và lấy dư cho 10^9 + 7.
			//
			// Đầu vào:
			// - Dòng 1: N là số lượng số nguyên.
			// - Dòng 2: Gồm N số nguyên, cách nhau bởi khoảng trắng.
			//
			// Giới hạn:
			// - 1 <= N <= 10^5
			// - Các số là số nguyên dương, không quá 10^6.
			//
			// Đầu ra:
			// - In ra tích các số chia dư cho 10^9 + 7.
			//
			// Ví dụ:
			// Input:
			// 5
			// 153 747 236 481 789
			//
			// Output:
			// 861464449
			freopen("Untitled6_input2.txt", "r", stdin);
			int n; cin >> n;
			int mod = 1000000007;
			ll tich = 1;
			for(int i = 0; i < n; i++){
			    ll x; cin >> x;
//			    tich *= x % mod;
//			    tich %= mod;
			    tich = (tich % mod) * (x % mod) % mod;
			}
			cout << tich << endl;
			break;
		}
    	case 3:{
			/*== [Đồng dư]. [Đồng Dư]. Bài 2. Tích chia dư ==*/
			//
			// Tính giai thừa các số từ 1 tới N và chia dư cho 10^9 + 7.
			//
			// Đầu vào:
			// - Dòng duy nhất chứa số nguyên dương N.
			//
			// Giới hạn:
			// - 1 <= N <= 10^6
			//
			// Đầu ra:
			// - In ra N dòng, tương ứng với giai thừa các số từ 1 tới N
			//   sau khi chia dư cho 10^9 + 7.
			//
			// Ví dụ:
			// Input:
			// 5
			//
			// Output:
			// 1
			// 2
			// 6
			// 24
			// 120
			break;
		}
	}
	return 0;
}