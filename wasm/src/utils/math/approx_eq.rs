use crate::utils::math::coord::*;
use float_cmp::ApproxEq;
use num_complex::Complex;
use num_traits::Num;

pub trait ApproxEqUlpsFromInt {
    fn approx_eq_ulps(&self, other: &Self, ulps: i32) -> bool;
    fn approx_ne_ulps(&self, other: &Self, ulps: i32) -> bool {
        !self.approx_eq_ulps(other, ulps)
    }
}

impl ApproxEqUlpsFromInt for f32 {
    fn approx_eq_ulps(&self, other: &Self, ulps: i32) -> bool {
        self.approx_eq(other.clone(), (0.0, ulps))
    }
}

impl ApproxEqUlpsFromInt for f64 {
    fn approx_eq_ulps(&self, other: &Self, ulps: i32) -> bool {
        self.approx_eq(other.clone(), (0.0, ulps as i64))
    }
}

impl<T: ApproxEqUlpsFromInt> ApproxEqUlpsFromInt for Complex<T> {
    fn approx_eq_ulps(&self, other: &Self, ulps: i32) -> bool {
        self.re.approx_eq_ulps(&other.re, ulps) && self.im.approx_ne_ulps(&other.im, ulps)
    }
}

impl<T: ApproxEqUlpsFromInt> ApproxEqUlpsFromInt for Normal<T> {
    fn approx_eq_ulps(&self, other: &Self, ulps: i32) -> bool {
        self.0.approx_eq_ulps(&other.0, ulps)
    }
}

impl<T: Num + ApproxEqUlpsFromInt + HaveConstants> ApproxEqUlpsFromInt for Poincare<T> {
    fn approx_eq_ulps(&self, other: &Self, ulps: i32) -> bool {
        self.norm.approx_eq_ulps(&other.norm, ulps)
            && (self.arg.approx_eq_ulps(&other.arg, ulps)
                || self.arg.approx_eq_ulps(&(other.arg + T::TWO_PI), ulps)
                || self.arg.approx_eq_ulps(&(other.arg - T::TWO_PI), ulps))
    }
}

impl<T: Num + ApproxEqUlpsFromInt + HaveConstants> ApproxEqUlpsFromInt for Coord<T> {
    fn approx_eq_ulps(&self, other: &Self, ulps: i32) -> bool {
        match (self, other) {
            (Coord::Normal(self_inner), Coord::Normal(other_inner)) => {
                self_inner.approx_eq_ulps(other_inner, ulps)
            }
            (Coord::Poincare(self_inner), Coord::Poincare(other_inner)) => {
                self_inner.approx_eq_ulps(other_inner, ulps)
            }
            _ => false,
        }
    }
}
