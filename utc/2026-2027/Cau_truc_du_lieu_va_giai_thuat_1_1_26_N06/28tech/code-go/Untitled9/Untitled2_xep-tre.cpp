#include<bits/stdc++.h>

using namespace std;
using ll = long long;

int main(){
	freopen("input2.cpp", "r", stdin);
	int n, x;
	cin >> n >> x;
	int a[n];
	for(int i = 0; i < n; i++){
	    cin >> a[i];
	}
	sort(a, a + n);
	int l = 0, r = n - 1;
	int dem = 0;
	while(l <= r){
	    if(a[l] + a[r] <= x){
	        ++dem; ++l; --r;
	    }
	    else{
	        ++dem; --r;
	    }
	}
	if(l == r) ++dem;
	cout << dem << endl;
	return 0;
}