use crate::utils::math::coord::HaveConstants;
use num_complex::Complex;
use num_traits::{Float, One, Zero};

pub fn expi_minus_1<T: Float + HaveConstants>(theta: T, err_thres: T) -> Complex<T> {
    let eta = theta.principal_arg();
    if eta.abs() >= err_thres {
        Complex::from_polar(T::ONE, eta) - Complex::one()
    } else {
        let mut n: T = T::ONE;
        // (iη)^n / n!
        let mut nth_term: Complex<T> = Complex::from_polar(T::ONE, eta);
        let mut res: Complex<T> = nth_term.clone();

        loop {
            n = n + T::ONE;
            nth_term = nth_term * Complex::new(T::ZERO, eta) / n;
            if nth_term == Complex::zero() {
                break;
            }
            res = res + nth_term;
        }

        res
    }
}
