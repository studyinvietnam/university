#include<bits/stdc++.h>

using namespace std;
using ll = long long;



int main(){
	freopen("input9.cpp", "r", stdin);
	// 24
	// Giải thích : 10 - 2 - 1 + 8 + 9 = 24
	int n, k; cin >> n >> k;
	int a[n];
	for(int i = 0; i < n; i++){
		cin >> a[i];
	}
	sort(a + 1, a + n, greater<int>());
	ll ans = a[0];
	for(int i = 1; i < n; i++){
		if(i <= k) ans += a[i];
		else ans -= a[i];
	}
	cout << ans << endl;
	return 0;
}