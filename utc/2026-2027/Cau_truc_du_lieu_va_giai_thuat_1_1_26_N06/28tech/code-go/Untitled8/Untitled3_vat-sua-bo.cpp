#include<bits/stdc++.h>

using namespace std;
using ll = long long;

int main(){
	freopen("input3.cpp", "r", stdin);
	int n; cin >> n;
	int a[n];
	for(int i = 0; i < n; i++){
		cin >> a[i];
	}
	sort(a, a+n, greater<int>());
	int ans = 0;
	for(int i = 0; i < n; i++){
		if(a[i] > i){
			ans += a[i] - i;
		}
		else break;
	}
	cout << ans << endl;
	return 0;
}
