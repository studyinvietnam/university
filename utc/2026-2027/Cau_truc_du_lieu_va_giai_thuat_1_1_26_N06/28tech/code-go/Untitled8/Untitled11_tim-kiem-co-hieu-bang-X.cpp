#include<bits/stdc++.h>

using namespace std;
using ll = long long;



int main(){
	freopen("input11.cpp", "r", stdin);
	int n, x; cin >> n >> x;
	int a[n];
	for(int i = 0; i < n; i++){
		cin >> a[i];
	}
	sort(a, a+n);
	for(int i = 0; i < n; i++){
		if(binary_search(a+i+1, a+n, a[i]+x)){
			cout << 1 << endl; return 0;
		}
	}
	cout << "-1\n";
	return 0;
}