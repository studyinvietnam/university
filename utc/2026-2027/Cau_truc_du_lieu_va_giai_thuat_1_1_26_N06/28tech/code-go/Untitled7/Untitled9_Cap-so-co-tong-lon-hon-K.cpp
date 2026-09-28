#include<bits/stdc++.h>

using namespace std;
using ll = long long;

int main(){
    freopen("input8.cpp", "r", stdin);
	ios::sync_with_stdio(false);
	cin.tie(nullptr);
	int n, k; cin >> n >> k;
	int a[n];
	for(int i = 0; i < n; i++){
	    cin >> a[i];
	}
	sort(a, a + n);
	ll ans = 0;
	for(int i = 0; i < n; i++){
	    //k - a[i]
	    auto it1 = upper_bound(a + i + 1, a + n, k - a[i]);
	    int pos = it1 - a; // chi so cua phan tu cuoi cung < k - a[i] : i + 1 => pos
	    ans += n - pos; // pos - (i + 1) + 1
	}
	cout << ans << endl;
	return 0;
}