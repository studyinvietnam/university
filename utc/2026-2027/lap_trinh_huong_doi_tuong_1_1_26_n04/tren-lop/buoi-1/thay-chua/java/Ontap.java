import java.util.Scanner;

class SinhVien {
    int ma;
    String ten;
    float diem;
    char truong;
}

public class Ontap {

    // nhap
    static void nhap(int n, SinhVien[] sv, Scanner sc) {
        for (int i = 0; i < n; i++) {
            System.out.print("1. Nhap ma: ");
            sv[i].ma = sc.nextInt();
            System.out.println("Da nhap ma!");
            sc.nextLine();
            System.out.print("2. Nhap ten: ");
            sv[i].ten = sc.nextLine();
            System.out.println("Da nhap ten!");
            System.out.print("3. Nhap diem: ");
            sv[i].diem = sc.nextFloat();
            System.out.println("Da nhap diem!");
            System.out.print("4. Nhap truong: ");
            sv[i].truong = sc.next().charAt(0);
            System.out.println("Da nhap truong!");
            sc.nextLine();
        }
    }

    static void xuat(int n, SinhVien[] sv) {
        for (int i = 0; i < n; i++) {
            System.out.printf("%s || %d || %.2f || %c%n", sv[i].ten, sv[i].ma, sv[i].diem, sv[i].truong);
        }
    }

    static int demTruong(int n, SinhVien[] sv, char truong) {
        int dem = 0;
        for (int i = 0; i < n; i++) {
            if (sv[i].truong == truong) {
                dem++;
            }
        }
        return dem;
    }

    static SinhVien[] truot(int n, SinhVien[] sv, float dc, int[] slTruot) {
        slTruot[0] = 0;
        SinhVien[] kq = new SinhVien[n];
        for (int i = 0; i < n; i++) {
            if (sv[i].diem < dc) {
                kq[slTruot[0]] = sv[i];
                slTruot[0]++;
            }
        }
        return kq;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n;
        n = sc.nextInt();
        sc.nextLine();
        // Cấp phát mảng sinh viên
        SinhVien[] sv = new SinhVien[n];
        for (int i = 0; i < n; i++) {
            sv[i] = new SinhVien();
        }
        nhap(n, sv, sc);
        xuat(n, sv);
        System.out.println("\nSo sv truong A: " + demTruong(n, sv, 'A'));
        System.out.println("So sv truong B: " + demTruong(n, sv, 'B'));
        System.out.println("So sv truong C: " + demTruong(n, sv, 'C'));
        // Danh sach sinh vien truot
        int[] slTruot = new int[1];
        SinhVien[] kq = truot(n, sv, 6, slTruot);
        System.out.println("\nCac SV bi truot la:");
        xuat(slTruot[0], kq);
        sc.close();
    }
}