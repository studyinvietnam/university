#include <bits/stdc++.h>

using namespace std;
using ll = long long;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for(int &x : a) cin >> x; 
    cout << endl;
    for(int i = 0; i < n; i++){
		// a[i]: 0 -> i-1
		bool check = true;
			// 1 2 3 4 1 2 3 4 5 (n = 9)
		for(int j=0; j<i; j++){
			if(a[i] == a[j]){
				check = false;
				break;
			}
		}
		if(check) cout << a[i] << " ";
	}
    cout << endl;
    //
    cout << endl;
    	// 1 2 3 1 2 (n = 5)
    int res = INT_MAX;
    cout << INT_MAX << endl;
	for(int i = 0; i < n; i++){
	// a[i]
		for(int j = i + 1; j < n; j++){
			if(abs(a[i] - a[j]) < res) {
				res = abs(a[i] - a[j]);
			}
		}
	}
	cout << res << endl;
    cout << endl;
//    for (int i = 0; i < n; i++) {
//        cin >> a[i];
//    }
	for(int i = 0; i < n; i++) {
		// a[i]
		for(int j = i + 1; j < n; j++){ 
			cout << a[i] << " " << a[j] << endl;
		}
	}
    cout << endl;
    // Liệt kê, đếm số nguyên tố, số CP, số thuận nghịch, .....
    for (int i = 0; i < n; i++) {
        cout << a[i] << ' ';
    }
    cout << endl;
    // Range-based for loop
    cout << endl;
    cout << "Range-based for loop: " << endl;
    for (int x : a) {
        cout << x << ' ';
    }
    cout << endl;
    // Range-based for loop &x=100
    cout << endl;
    cout << "Range-based for loop (&x=100): " << endl;
    for (int &x : a) {
        x = 100;
    }
    for (int i = 0; i < n; i++) {
        cout << a[i] << ' ';
    }
    cout << endl;
    return 0;
}