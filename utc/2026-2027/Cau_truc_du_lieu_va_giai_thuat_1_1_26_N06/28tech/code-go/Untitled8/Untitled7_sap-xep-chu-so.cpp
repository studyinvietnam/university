#include<bits/stdc++.h>

using namespace std;
using ll = long long;

int main(){
	freopen("input7.cpp", "r", stdin);
	// 1 3 6 7 8 9
	int cnt[10] = {0};
	int n; cin >> n;
	for(int i = 0; i < n; i++){
		int x; cin >> x;
		if(x == 0) cnt[0] = 1;
		while(x != 0){
			cnt[x % 10] = 1;
			x /= 10;
		}
	}
	for(int i = 0; i < 10; i++){
		if(cnt[i]) cout << i << " ";
	}
	return 0;
}