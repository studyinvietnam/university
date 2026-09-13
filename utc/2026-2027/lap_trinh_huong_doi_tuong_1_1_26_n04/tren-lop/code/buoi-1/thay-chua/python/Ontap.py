class SinhVien:
    def __init__(self):
        self.ma = 0
        self.ten = ""
        self.diem = 0.0
        self.truong = ""


# nhap
def nhap(n, sv):
    for i in range(n):
        print("1. Nhap ma: ", end="")
        sv[i].ma = int(input())
        print("Da nhap ma!")
        print("2. Nhap ten: ", end="")
        sv[i].ten = input()
        print("Da nhap ten!")
        print("3. Nhap diem: ", end="")
        sv[i].diem = float(input())
        print("Da nhap diem!")
        print("4. Nhap truong: ", end="")
        sv[i].truong = input()[0]
        print("Da nhap truong!")
        print()


def xuat(n, sv):
    for i in range(n):
        print(f"{sv[i].ten} || " f"{sv[i].ma} || " f"{sv[i].diem:.2f} || " f"{sv[i].truong}")


def demTruong(n, sv, truong):
    dem = 0
    for i in range(n):
        if sv[i].truong == truong:
            dem += 1
    return dem


def truot(n, sv, dc):
    kq = []
    slTruot = 0
    for i in range(n):
        if sv[i].diem < dc:
            kq.append(sv[i])
            slTruot += 1
    return kq, slTruot


def main():
    n = int(input())
    # Cấp phát danh sách sinh viên
    sv = []
    for i in range(n):
        sv.append(SinhVien())
    nhap(n, sv)
    xuat(n, sv)
    print("\nSo sv truong A:", demTruong(n, sv, 'A'))
    print("So sv truong B:", demTruong(n, sv, 'B'))
    print("So sv truong C:", demTruong(n, sv, 'C'))
    # Danh sach sinh vien truot
    kq, slTruot = truot(n, sv, 6)
    print("\nCac SV bi truot la:")
    xuat(slTruot, kq)
main()