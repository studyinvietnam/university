#include<bits/stdc++.h>

using namespace std;
using ll = long long;

int main(){
	freopen("input2.cpp", "r", stdin);
	int n, x; cin >> n >> x;
	int a[n];
	for(int i = 0; i < n; i++){
		cin >> a[i];
	}
	sort(a, a+n, greater<int>());
	int dc = a[0];
	int ans = 1;
	for(int i = 0; i < n; i++){
		if(dc <= 0) break;
		++ans;
		dc = min(dc - 1, a[i]);
	}
	cout << ans << endl;
	return 0;
}
