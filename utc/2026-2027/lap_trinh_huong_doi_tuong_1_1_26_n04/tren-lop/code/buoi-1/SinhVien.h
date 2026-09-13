#ifndef SINHVIEN_H
#define SINHVIEN_H

#include <bits/stdc++.h>

using namespace std;

struct SinhVien {
    char MSV[20];
    char hoTen[50];
    double diem;
    char truong[20];
};

void nhap(SinhVien sv[], int &n);

void thongKeSinhVien(struct SinhVien sv[], int n);

#endif