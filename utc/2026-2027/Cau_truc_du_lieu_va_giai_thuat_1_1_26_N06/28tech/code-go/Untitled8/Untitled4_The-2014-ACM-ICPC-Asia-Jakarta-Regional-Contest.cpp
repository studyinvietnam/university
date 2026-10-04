#include<bits/stdc++.h>

using namespace std;
using ll = long long;

int main(){
	freopen("input4.cpp", "r", stdin);
	int n, k; cin >> n >> k;
	int a[n];
	for(int i = 0; i < n; i++){
		cin >> a[i];
	}
	sort(a, a+n);
	int ans = 1;
	for(int i = 1; i < n; i++){
		if(a[i] - a[i-1] > k) ++ans;
	}
	cout << ans << endl;
	return 0;
}
