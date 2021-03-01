use crate::utils::math::approx_eq::*;
use crate::utils::math::complex::expi_minus_1;
use crate::utils::math::coord::*;
use crate::utils::math::group::Group;
use num_complex::Complex;
use num_traits::Num;
use num_traits::{float::Float, One};
use std::fmt::Debug;

/// Define an automorphism of Poincare disk.
///
/// f(z) = †? ( e^(iθ) (z + c) / (c̄ z + 1) )
///
/// i.e., f = †? ∘ R_θ ∘ T_c
/// reflection^ rotation ^translation
///
/// where R_θ (z) = e^(iθ) z and T_c (z) = (z + c) / (c̄ z + 1)
#[derive(Clone, Hash, Debug, Default)]
pub struct PoincareAut<T> {
    pub trsl: Poincare<T>, // c
    pub rotn: T,           // θ
    pub refl: bool,        // †?
}

impl<T: Float + ApproxEqUlpsFromInt + HaveConstants> PartialEq for PoincareAut<T> {
    fn eq(&self, other: &Self) -> bool {
        self.trsl.approx_eq_ulps(&other.trsl, 2)
            && Complex::from_polar(T::ONE, self.rotn)
                .approx_eq_ulps(&Complex::from_polar(T::ONE, other.rotn), 2)
            && self.refl == other.refl
    }
}

impl<T> PoincareAut<T> {
    /// Create a new Mobius transform which is an automorphism on Poincare disk.
    #[inline]
    pub const fn new(trsl: Poincare<T>, rotn: T, refl: bool) -> Self {
        PoincareAut { trsl, rotn, refl }
    }
}

impl<T: Clone + Num + HaveConstants> PoincareAut<T> {
    /// Create a new Mobius transform T_v which translates the origin to the given point.
    #[inline]
    pub fn translation(trsl: Poincare<T>) -> Self {
        Self::new(trsl, T::zero(), false)
    }

    /// Create a new Mobius transform R_θ which rotates the disk by θ around the origin.
    #[inline]
    pub fn rotation(rotn: T) -> Self {
        Self::new(Poincare::zero(), rotn.principal_arg(), false)
    }

    /// Create a new Mobius transform † which flips the disk with respect to the x-axis (real axis).
    #[inline]
    pub fn reflection() -> Self {
        Self::new(Poincare::zero(), T::zero(), true)
    }
}

/// Define ε_r and ε_η.
///
/// TODO: what are the most efficient thresholds?
pub trait PoincareAutCalcThres {
    /// ε_r
    const THRES_NORM: Self;

    /// ε_η
    const THRES_ARG: Self;
}

impl PoincareAutCalcThres for f32 {
    const THRES_NORM: Self = 1e-3;
    const THRES_ARG: Self = 1e-3;
}

impl PoincareAutCalcThres for f64 {
    const THRES_NORM: Self = 1e-5;
    const THRES_ARG: Self = 1e-5;
}

impl<T: Float + HaveConstants + PoincareAutCalcThres + ApproxEqUlpsFromInt> Group
    for PoincareAut<T>
{
    /// Compose self with other.
    ///
    /// self = †^n ∘ R_φ ∘ T_w, other = †^m ∘ R_θ ∘ T_v.
    fn op(&self, other: &Self) -> Self {
        let w = self.trsl;
        let v = other.trsl;

        // w̃ = e^(-iθ) †?(w), where θ = other.rotn and †? = other.refl
        let w_tilde = (if other.refl { w.conj() } else { w }).rotate(other.rotn.neg());
        let (psi, trsl) = compose_trsl(w_tilde, v);

        let refl = self.refl != other.refl;
        let rotn = psi + other.rotn + self.rotn * (if other.refl { T::ONE.neg() } else { T::ONE });

        Self::new(trsl, rotn, refl)
    }

    fn id() -> Self {
        Self::rotation(T::ZERO)
    }

    fn inv(&self) -> Self {
        let v = self.trsl;
        let m1_refl = if self.refl { T::ONE.neg() } else { T::ONE };

        let trsl = (if self.refl { v.conj() } else { v })
            .rotate(m1_refl * self.rotn)
            .neg();
        let rotn = self.rotn * m1_refl.neg();

        Self::new(trsl, rotn, self.refl)
    }
}

/// A helper function for calculating 1 + v̄ w
///
/// Returns (norm: T, arg: T)
fn calc_one_plus_v_conj_times_w<T: Float + HaveConstants + PoincareAutCalcThres>(
    v: Poincare<T>,
    w: Poincare<T>,
) -> (T, T) {
    // e^(-δ_v)
    let exp_neg_v_norm = v.norm.neg().exp();
    // e^(-δ_w)
    let exp_neg_w_norm = w.norm.neg().exp();

    let v_normal_norm = (T::ONE - exp_neg_v_norm) / (T::ONE + exp_neg_v_norm);
    let w_normal_norm = (T::ONE - exp_neg_w_norm) / (T::ONE + exp_neg_w_norm);
    let eta = (w.arg - v.arg + T::PI).principal_arg();

    let ret: Complex<T> = if v_normal_norm < T::ONE - T::THRES_NORM
        || w_normal_norm < T::ONE - T::THRES_NORM
        || eta.abs() > T::THRES_ARG
    {
        let v_normal: Complex<T> = Complex::from_polar(v_normal_norm, v.arg);
        let w_normal: Complex<T> = Complex::from_polar(w_normal_norm, w.arg);
        Complex::<T>::one() + (v_normal.conj() * w_normal)
    } else {
        let first_term = {
            // 2 (e^(-δ_v) + e^(-δ_w))
            let numer = T::TWO * (exp_neg_v_norm + exp_neg_w_norm);
            // (1 + e^(-δ_v)) * (1 + e^(-δ_w))
            let denom = (T::ONE + exp_neg_v_norm) * (T::ONE + exp_neg_w_norm);
            Complex::from(numer / denom)
        };
        let second_term = expi_minus_1(eta, T::THRES_ARG).scale(v_normal_norm * w_normal_norm);
        first_term - second_term
    };
    (ret.norm(), ret.arg())
}

/// A helper function for calculating 1 + v̄ w
///
/// Returns (norm: T, arg: T)
fn calc_v_plus_w<T: Float + HaveConstants + PoincareAutCalcThres>(
    v: Poincare<T>,
    w: Poincare<T>,
) -> (T, T) {
    // e^(-δ_v)
    let exp_neg_v_norm = v.norm.neg().exp();
    // e^(-δ_w)
    let exp_neg_w_norm = w.norm.neg().exp();

    let v_normal_norm = (T::ONE - exp_neg_v_norm) / (T::ONE + exp_neg_v_norm);
    let w_normal_norm = (T::ONE - exp_neg_w_norm) / (T::ONE + exp_neg_w_norm);
    let eta = (w.arg - v.arg + T::PI).principal_arg();

    if (v_normal_norm - w_normal_norm).abs() > T::THRES_NORM || eta.abs() > T::THRES_ARG {
        let v_normal: Complex<T> = Complex::from_polar(v_normal_norm, v.arg);
        let w_normal: Complex<T> = Complex::from_polar(w_normal_norm, w.arg);
        let ret = v_normal + w_normal;
        (ret.norm(), ret.arg())
    } else {
        let first_term = {
            // 2 (e^(-δ_v) + e^(-δ_w))
            let numer = T::TWO * (exp_neg_v_norm + exp_neg_w_norm);
            // (1 + e^(-δ_v)) * (1 + e^(-δ_w))
            let denom = (T::ONE + exp_neg_v_norm) * (T::ONE + exp_neg_w_norm);
            Complex::from(numer / denom)
        };
        let second_term = expi_minus_1(eta, T::THRES_ARG).scale(w_normal_norm);
        let ret = first_term - second_term;
        (ret.norm(), (ret.arg() + v.arg).principal_arg())
    }
}

/// A helper function for composing two translations
///
/// Receives `w: Poincare<T>` and `v: Poincare<T>`
/// and returns `(ψ: T, u: Poincare<T>)` where
/// T_w ∘ T_v = R_ψ ∘ T_u
fn compose_trsl<T: Float + HaveConstants + PoincareAutCalcThres>(
    w: Poincare<T>,
    v: Poincare<T>,
) -> (T, Poincare<T>) {
    // e^(-δ_v)
    let exp_neg_v_norm = v.norm.neg().exp();
    // e^(-δ_w)
    let exp_neg_w_norm = w.norm.neg().exp();
    let (one_plus_v_conj_times_w_norm, one_plus_v_conj_times_w_arg) =
        calc_one_plus_v_conj_times_w(v, w);
    let (v_plus_w_norm, v_plus_w_arg) = calc_v_plus_w(v, w);

    let psi = one_plus_v_conj_times_w_arg + one_plus_v_conj_times_w_arg;
    let u_arg = v_plus_w_arg - one_plus_v_conj_times_w_arg;
    // r_u^*
    let u_normal_norm_comp = {
        // 16 e^(-(δ_v + δ_w))
        let numer = T::SIXTEEN * (v.norm + w.norm).neg().exp();
        // (1 + e^(-δ_v))^2 * (1 + e^(-δ_v))^2 * |1 + v̄ w| (|1 + v̄ w| + |v + w|)
        let denom = {
            let res = (T::ONE + exp_neg_v_norm) * (T::ONE + exp_neg_w_norm);
            res * res
                * one_plus_v_conj_times_w_norm
                * (one_plus_v_conj_times_w_norm + v_plus_w_norm)
        };
        numer / denom
    };

    if u_normal_norm_comp > T::THRES_NORM {
        let u_norm = (T::TWO / u_normal_norm_comp - T::ONE).ln();
        return (psi, Poincare::new(u_norm, u_arg));
    }

    // \sum_{k=1}^∞ (r_u^* / 2)^k / k
    let sum = {
        let mut k: T = T::ONE;
        // (r_u^* / 2)^k
        let mut term = u_normal_norm_comp / T::TWO;
        let mut res = term.clone();

        loop {
            k = k + T::ONE;
            term = term * u_normal_norm_comp / T::TWO;

            // (r_u^* / 2)^k / k
            let term_over_k = term / k;
            if term_over_k == T::zero() {
                break;
            }
            res = res + term_over_k;
        }

        res
    };

    // δ_u
    let u_norm = v.norm + w.norm - T::EIGHT.ln()
        + T::TWO * (T::ONE + exp_neg_v_norm).ln()
        + T::TWO * (T::ONE + exp_neg_w_norm).ln()
        - one_plus_v_conj_times_w_norm.ln()
        - (one_plus_v_conj_times_w_norm + v_plus_w_norm).ln()
        - sum;

    (psi, Poincare::new(u_norm, u_arg))
}
