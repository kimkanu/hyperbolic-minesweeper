# Hyperbolic Minesweeper Wasm Docs

This directory contains files compiling a wasm file for the web app. This docs is for describing the APIs and algorithms used to implement features.

## Coordinate Systems

Any point will be represented as a complex number, with a help of `num-complex` crate. The basic coordinate systems we impose are the following:

* Normal Cartesian/polar coordinate
* Poincare disk model: a pair of the distance (w.r.t. the metric of Poincare disk model) from the center of the disk and the angle. This is called the *azimuthal equidistant projection*.


## Poincare Disk Model

### Automorphism Group

The automorphism group of Poincare disk model <!-- $C_\infty$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/C_%5Cinfty"> is isomorphic to <!-- $\mathrm{PSL}(2;\mathbb R)$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cmathrm%7BPSL%7D(2%3B%5Cmathbb%20R)">, and has the following concrete construction:

<!-- $$f = \dagger^{n} \circ R_\theta \circ T_v \in \mathrm{Aut}(C_\infty)$$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/f%20%3D%20%5Cdagger%5E%7Bn%7D%20%5Ccirc%20R_%5Ctheta%20%5Ccirc%20T_v%20%5Cin%20%5Cmathrm%7BAut%7D(C_%5Cinfty)"></div>

where <!-- $v$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/v"> is the representation in polar coordinate of a point in Poincare disk, <!-- $n\in\{0,1\}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/n%5Cin%5C%7B0%2C1%5C%7D">, <!-- $T_v(z) = \frac{z + v}{\bar v z + 1}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/T_v(z)%20%3D%20%5Cfrac%7Bz%20%2B%20v%7D%7B%5Cbar%20v%20z%20%2B%201%7D">, <!-- $R_\theta(z) = e^{i\theta}z$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/R_%5Ctheta(z)%20%3D%20e%5E%7Bi%5Ctheta%7Dz">, and <!-- $\dagger(z) = \bar{z}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cdagger(z)%20%3D%20%5Cbar%7Bz%7D">. This automorphism group is modeled by `struct PoincareAut<T>` in `src/utils/math/poincare_aut.rs`.


#### Composition

To compose two automorphisms, we observe following rules:

<!-- $$T_w \circ \dagger(z) = \frac{\bar{z} + w}{\overline{wz} + 1} = \overline{\left(\frac{z + \bar{w}}{wz + 1}\right)} = \dagger\circ T_{\bar{w}}(z),$$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/T_w%20%5Ccirc%20%5Cdagger(z)%20%3D%20%5Cfrac%7B%5Cbar%7Bz%7D%20%2B%20w%7D%7B%5Coverline%7Bwz%7D%20%2B%201%7D%20%3D%20%5Coverline%7B%5Cleft(%5Cfrac%7Bz%20%2B%20%5Cbar%7Bw%7D%7D%7Bwz%20%2B%201%7D%5Cright)%7D%20%3D%20%5Cdagger%5Ccirc%20T_%7B%5Cbar%7Bw%7D%7D(z)%2C"></div>

<!-- $$R_\theta \circ \dagger(z) = e^{i\theta}\bar{z} = \overline{e^{-i\theta}z} = \dagger\circ R_{-\theta} (z),$$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/R_%5Ctheta%20%5Ccirc%20%5Cdagger(z)%20%3D%20e%5E%7Bi%5Ctheta%7D%5Cbar%7Bz%7D%20%3D%20%5Coverline%7Be%5E%7B-i%5Ctheta%7Dz%7D%20%3D%20%5Cdagger%5Ccirc%20R_%7B-%5Ctheta%7D%20(z)%2C"></div>

<!-- $$T_w \circ R_\theta (z) = \frac{ e^{i\theta}z + w }{ \bar w e^{i\theta} z + 1 } = e^{i\theta} \frac{z + e^{-i\theta}w}{\overline{e^{-i\theta}w}z + 1} = R_\theta \circ T_{e^{-i\theta} w} (z),$$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/T_w%20%5Ccirc%20R_%5Ctheta%20(z)%20%3D%20%5Cfrac%7B%20e%5E%7Bi%5Ctheta%7Dz%20%2B%20w%20%7D%7B%20%5Cbar%20w%20e%5E%7Bi%5Ctheta%7D%20z%20%2B%201%20%7D%20%3D%20e%5E%7Bi%5Ctheta%7D%20%5Cfrac%7Bz%20%2B%20e%5E%7B-i%5Ctheta%7Dw%7D%7B%5Coverline%7Be%5E%7B-i%5Ctheta%7Dw%7Dz%20%2B%201%7D%20%3D%20R_%5Ctheta%20%5Ccirc%20T_%7Be%5E%7B-i%5Ctheta%7D%20w%7D%20(z)%2C"></div>

and

<!-- $$T_w \circ T_v(z) = \frac{\frac{z + v}{\bar{v}z + 1} + w}{\bar{w} \frac{z + v}{\bar{v}z + 1} + 1} = \frac{(1 + \bar v w)z + (v + w)}{\overline{(v + w)}z + (1 + v \bar{w})} = R_\psi\circ T_u (z)$$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/T_w%20%5Ccirc%20T_v(z)%20%3D%20%5Cfrac%7B%5Cfrac%7Bz%20%2B%20v%7D%7B%5Cbar%7Bv%7Dz%20%2B%201%7D%20%2B%20w%7D%7B%5Cbar%7Bw%7D%20%5Cfrac%7Bz%20%2B%20v%7D%7B%5Cbar%7Bv%7Dz%20%2B%201%7D%20%2B%201%7D%20%3D%20%5Cfrac%7B(1%20%2B%20%5Cbar%20v%20w)z%20%2B%20(v%20%2B%20w)%7D%7B%5Coverline%7B(v%20%2B%20w)%7Dz%20%2B%20(1%20%2B%20v%20%5Cbar%7Bw%7D)%7D%20%3D%20R_%5Cpsi%5Ccirc%20T_u%20(z)"></div>

where <!-- $\psi = \operatorname{arg} \frac{1 + \bar v w}{1 + v \bar w} = 2\operatorname{arg} (1 + \bar v w)$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cpsi%20%3D%20%5Coperatorname%7Barg%7D%20%5Cfrac%7B1%20%2B%20%5Cbar%20v%20w%7D%7B1%20%2B%20v%20%5Cbar%20w%7D%20%3D%202%5Coperatorname%7Barg%7D%20(1%20%2B%20%5Cbar%20v%20w)"> and <!-- $u = \frac{v + w}{1 + \bar v w} = T_v(w)$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/u%20%3D%20%5Cfrac%7Bv%20%2B%20w%7D%7B1%20%2B%20%5Cbar%20v%20w%7D%20%3D%20T_v(w)">.

In summary, we have

<!-- $$(\dagger^n \circ R_\varphi \circ T_w) \circ (\dagger^m \circ R_\theta \circ T_v) = \dagger^{n+m} \circ R_{\theta + (-1)^m \varphi + \psi} \circ T_u$$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/(%5Cdagger%5En%20%5Ccirc%20R_%5Cvarphi%20%5Ccirc%20T_w)%20%5Ccirc%20(%5Cdagger%5Em%20%5Ccirc%20R_%5Ctheta%20%5Ccirc%20T_v)%20%3D%20%5Cdagger%5E%7Bn%2Bm%7D%20%5Ccirc%20R_%7B%5Ctheta%20%2B%20(-1)%5Em%20%5Cvarphi%20%2B%20%5Cpsi%7D%20%5Ccirc%20T_u"></div>

where <!-- $\psi = 2 \operatorname{arg}(1 + \bar v e^{-i\theta} \dagger^m (w)))$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cpsi%20%3D%202%20%5Coperatorname%7Barg%7D(1%20%2B%20%5Cbar%20v%20e%5E%7B-i%5Ctheta%7D%20%5Cdagger%5Em%20(w)))"> and <!-- $u = T_v(e^{-i\theta} \dagger^m(w))$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/u%20%3D%20T_v(e%5E%7B-i%5Ctheta%7D%20%5Cdagger%5Em(w))">.


#### Considering the Nature of Floating Numbers

However, this is not the end; we need to convert <!-- $T_v$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/T_v">s from/into Poincare disk model. What makes worse is that we cannot use conversion of polar coordinate into Poincare disk model due to its accuracy. For instance, since `f32` has 24-bit significand, the norm of a point inside the unit disk in polar coordinate is at most <!-- $1 - 2^{-24}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/1%20-%202%5E%7B-24%7D">, under the most ideal situation. And this radius corresponds to <!-- $\log(2^{25} - 1) \approx 17.32868$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Clog(2%5E%7B25%7D%20-%201)%20%5Capprox%2017.32868"> in Poincare disk model. `f64` is not that different: <!-- $\log(2^{54} - 1) \approx 37.42995$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Clog(2%5E%7B54%7D%20-%201)%20%5Capprox%2037.42995">. Thus, if we change coordinate systems carelessly, it might result in a significant error outside of a small region (centered at the origin). This is the reason that `trsl` is typed as `Poincare<T>`, not `Normal<T>`.


#### Calculation of <!-- $\boldsymbol{1 + \bar v w}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cboldsymbol%7B1%20%2B%20%5Cbar%20v%20w%7D">

What we need to calculate are the values of <!-- $\psi$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cpsi"> and <!-- $u$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/u"> described above. Before that, let us first calculate <!-- $1 + \bar v w$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/1%20%2B%20%5Cbar%20v%20w"> and <!-- $T_v(w)$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/T_v(w)"> for arbitrary points <!-- $v$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/v"> and <!-- $w$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/w"> inside Poincare disk.

With the calculation of <!-- $1 + \bar{v} w$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/1%20%2B%20%5Cbar%7Bv%7D%20w">, the only bad situation is that <!-- $1 + \bar{v} w \approx 0$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/1%20%2B%20%5Cbar%7Bv%7D%20w%20%5Capprox%200">, that is, <!-- $|v|,|w|\approx 1$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%7Cv%7C%2C%7Cw%7C%5Capprox%201"> and <!-- $\operatorname{arg}(w) - \operatorname{arg}(v) \approx \pi \pmod{2\pi}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Coperatorname%7Barg%7D(w)%20-%20%5Coperatorname%7Barg%7D(v)%20%5Capprox%20%5Cpi%20%5Cpmod%7B2%5Cpi%7D">. Otherwise, the value will be quite reliable.

Let <!-- $v = |v| e^{i\varpi}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/v%20%3D%20%7Cv%7C%20e%5E%7Bi%5Cvarpi%7D">, <!-- $w = |w| e^{i\varphi}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/w%20%3D%20%7Cw%7C%20e%5E%7Bi%5Cvarphi%7D">, <!-- $r_v^* := 1 - |v|$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/r_v%5E*%20%3A%3D%201%20-%20%7Cv%7C">, and <!-- $r_w^* \coloneqq 1 - |w|$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/r_w%5E*%20%5Ccoloneqq%201%20-%20%7Cw%7C">. Suppose <!-- $r_v^*, r_w^* < \varepsilon_r$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/r_v%5E*%2C%20r_w%5E*%20%3C%20%5Cvarepsilon_r"> for some constant <!-- $\varepsilon_r > 0$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cvarepsilon_r%20%3E%200"> w.r.t. the datatype. (Otherwise, direct calculation might be better since it uses less operations so that it has less round-off errors.) Then, we have

<!-- $$1 + \bar{v} w = 1 + (1 - r_v^*)(1 - r_w^*) e^{i(\varphi - \varpi)} = (r_v^* + r_w^* - r_v^* r_w^*) - |v||w|(e^{i\eta} - 1)$$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/1%20%2B%20%5Cbar%7Bv%7D%20w%20%3D%201%20%2B%20(1%20-%20r_v%5E*)(1%20-%20r_w%5E*)%20e%5E%7Bi(%5Cvarphi%20-%20%5Cvarpi)%7D%20%3D%20(r_v%5E*%20%2B%20r_w%5E*%20-%20r_v%5E*%20r_w%5E*)%20-%20%7Cv%7C%7Cw%7C(e%5E%7Bi%5Ceta%7D%20-%201)"></div>

where <!-- $\eta = \varphi - \varpi + \pi = \operatorname{arg}(w) - \operatorname{arg}(v) + \pi \pmod{2\pi}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Ceta%20%3D%20%5Cvarphi%20-%20%5Cvarpi%20%2B%20%5Cpi%20%3D%20%5Coperatorname%7Barg%7D(w)%20-%20%5Coperatorname%7Barg%7D(v)%20%2B%20%5Cpi%20%5Cpmod%7B2%5Cpi%7D"> with <!-- $|\eta| \ll 1$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%7C%5Ceta%7C%20%5Cll%201">.

Then <!-- $e^{i\eta} - 1$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/e%5E%7Bi%5Ceta%7D%20-%201"> can be calculated for small <!-- $\eta$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Ceta"> easily with Taylor series expansion without losing precision. Also, the first term is real and the second term is almost pure imaginary, there will not be much interference between two terms. So, this would be the most ideal calculation under our 'finite universe' situation.


#### Calculation of <!-- $\boldsymbol{T_v(w)}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cboldsymbol%7BT_v(w)%7D">

Let us focus on <!-- $u = T_v(w) = \frac{v + w}{1 + \bar{v} w}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/u%20%3D%20T_v(w)%20%3D%20%5Cfrac%7Bv%20%2B%20w%7D%7B1%20%2B%20%5Cbar%7Bv%7D%20w%7D"> for <!-- $v=|v|e^{i\varpi}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/v%3D%7Cv%7Ce%5E%7Bi%5Cvarpi%7D"> and <!-- $w=|w|e^{i\varphi}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/w%3D%7Cw%7Ce%5E%7Bi%5Cvarphi%7D">. <!-- $v + w$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/v%20%2B%20w"> has small norm when <!-- $\operatorname{arg}(v) - \operatorname{arg}(w) \approx \pi$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Coperatorname%7Barg%7D(v)%20-%20%5Coperatorname%7Barg%7D(w)%20%5Capprox%20%5Cpi"> and <!-- $|v| \approx |w|$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%7Cv%7C%20%5Capprox%20%7Cw%7C">. (Or <!-- $|v|$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%7Cv%7C"> and <!-- $|w|$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%7Cw%7C"> are small, but there is nothing interesting in this case since resulting <!-- $u$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/u"> is near <!-- $0\in C_\infty$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/0%5Cin%20C_%5Cinfty"> so that the conversion into Poincare disk model does not go weird.) Another critical error that could be arisen here is when <!-- $|u|$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%7Cu%7C"> is near 1, as before.

Observe that

<!-- $$1 - |u| = \frac{|1 + \bar{v} w| - |v + w|}{|1 + \bar{v} w|} = \frac{(1 - |v|)(1 - |w|)(1 + |v|)(1 + |w|)}{|1 + \bar{v} w|(|1 + \bar{v} w| + |v + w|)}$$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/1%20-%20%7Cu%7C%20%3D%20%5Cfrac%7B%7C1%20%2B%20%5Cbar%7Bv%7D%20w%7C%20-%20%7Cv%20%2B%20w%7C%7D%7B%7C1%20%2B%20%5Cbar%7Bv%7D%20w%7C%7D%20%3D%20%5Cfrac%7B(1%20-%20%7Cv%7C)(1%20-%20%7Cw%7C)(1%20%2B%20%7Cv%7C)(1%20%2B%20%7Cw%7C)%7D%7B%7C1%20%2B%20%5Cbar%7Bv%7D%20w%7C(%7C1%20%2B%20%5Cbar%7Bv%7D%20w%7C%20%2B%20%7Cv%20%2B%20w%7C)%7D"></div>

and

<!-- $$v + w = |v| e^{i\varpi} + |w| e^{i\varphi} = e^{i\varpi} ((r_w^* - r_v^*) - |w|(e^{i\eta} - 1))$$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/v%20%2B%20w%20%3D%20%7Cv%7C%20e%5E%7Bi%5Cvarpi%7D%20%2B%20%7Cw%7C%20e%5E%7Bi%5Cvarphi%7D%20%3D%20e%5E%7Bi%5Cvarpi%7D%20((r_w%5E*%20-%20r_v%5E*)%20-%20%7Cw%7C(e%5E%7Bi%5Ceta%7D%20-%201))"></div>

where <!-- $\eta = \varphi - \varpi + \pi = \operatorname{arg}(w) - \operatorname{arg}(v) + \pi \pmod{2\pi}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Ceta%20%3D%20%5Cvarphi%20-%20%5Cvarpi%20%2B%20%5Cpi%20%3D%20%5Coperatorname%7Barg%7D(w)%20-%20%5Coperatorname%7Barg%7D(v)%20%2B%20%5Cpi%20%5Cpmod%7B2%5Cpi%7D"> with <!-- $|\eta| \ll 1$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%7C%5Ceta%7C%20%5Cll%201">. Then, 

<!-- $$\operatorname{arg}(u) = \operatorname{arg}(v + w) - \operatorname{arg}(1 + \bar{v} w)$$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/%5Coperatorname%7Barg%7D(u)%20%3D%20%5Coperatorname%7Barg%7D(v%20%2B%20w)%20-%20%5Coperatorname%7Barg%7D(1%20%2B%20%5Cbar%7Bv%7D%20w)"></div>

can be obtained.

Now, we need to obtain <!-- $\delta_u$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cdelta_u">. Let <!-- $v$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/v"> and <!-- $w$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/w"> have <!-- $\delta_v$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cdelta_v"> and <!-- $\delta_w$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cdelta_w"> as their Poincare disk norm, resp., i.e.,

<!-- $$r_v^* = 1 - |v| = \frac{2}{e^{\delta_v} + 1}, \quad r_w^* = 1 - |w| = \frac{2}{e^{\delta_w} + 1}.$$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/r_v%5E*%20%3D%201%20-%20%7Cv%7C%20%3D%20%5Cfrac%7B2%7D%7Be%5E%7B%5Cdelta_v%7D%20%2B%201%7D%2C%20%5Cquad%20r_w%5E*%20%3D%201%20-%20%7Cw%7C%20%3D%20%5Cfrac%7B2%7D%7Be%5E%7B%5Cdelta_w%7D%20%2B%201%7D."></div>

Then, we have <!-- $$r_u^* = 1 - |u| = \frac{4e^{\delta_v}}{(e^{\delta_v} + 1)^2}\cdot\frac{4e^{\delta_w}}{(e^{\delta_w} + 1)^2}\cdot \frac{1}{|1 + \bar{v} \tilde{w}|(|1 + \bar{v} \tilde{w}| + |v + \tilde{w}|)}$$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/r_u%5E*%20%3D%201%20-%20%7Cu%7C%20%3D%20%5Cfrac%7B4e%5E%7B%5Cdelta_v%7D%7D%7B(e%5E%7B%5Cdelta_v%7D%20%2B%201)%5E2%7D%5Ccdot%5Cfrac%7B4e%5E%7B%5Cdelta_w%7D%7D%7B(e%5E%7B%5Cdelta_w%7D%20%2B%201)%5E2%7D%5Ccdot%20%5Cfrac%7B1%7D%7B%7C1%20%2B%20%5Cbar%7Bv%7D%20%5Ctilde%7Bw%7D%7C(%7C1%20%2B%20%5Cbar%7Bv%7D%20%5Ctilde%7Bw%7D%7C%20%2B%20%7Cv%20%2B%20%5Ctilde%7Bw%7D%7C)%7D"></div>

where <!-- $1 + \bar{v} w$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/1%20%2B%20%5Cbar%7Bv%7D%20w"> and <!-- $v + w$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/v%20%2B%20w"> are calculated as follows:

<!-- $$1 + \bar{v} w = \begin{cases}
\frac{2(e^{\delta_v} + e^{\delta_w})}{(e^{\delta_v} + 1)(e^{\delta_w} + 1)} - \frac{(e^{\delta_v} - 1)(e^{\delta_w} - 1)}{(e^{\delta_v} + 1)(e^{\delta_w} + 1)}(e^{i\eta} - 1), & r_v^* ,r_w^* < \varepsilon_r\text{ and }|\eta| < \varepsilon_{\eta}  \\
\text{direct calculation}, &\text{otherwise}
\end{cases} $$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/1%20%2B%20%5Cbar%7Bv%7D%20w%20%3D%20%5Cbegin%7Bcases%7D%0D%0A%5Cfrac%7B2(e%5E%7B%5Cdelta_v%7D%20%2B%20e%5E%7B%5Cdelta_w%7D)%7D%7B(e%5E%7B%5Cdelta_v%7D%20%2B%201)(e%5E%7B%5Cdelta_w%7D%20%2B%201)%7D%20-%20%5Cfrac%7B(e%5E%7B%5Cdelta_v%7D%20-%201)(e%5E%7B%5Cdelta_w%7D%20-%201)%7D%7B(e%5E%7B%5Cdelta_v%7D%20%2B%201)(e%5E%7B%5Cdelta_w%7D%20%2B%201)%7D(e%5E%7Bi%5Ceta%7D%20-%201)%2C%20%26%20r_v%5E*%20%2Cr_w%5E*%20%3C%20%5Cvarepsilon_r%5Ctext%7B%20and%20%7D%7C%5Ceta%7C%20%3C%20%5Cvarepsilon_%7B%5Ceta%7D%20%20%5C%5C%0D%0A%5Ctext%7Bdirect%20calculation%7D%2C%20%26%5Ctext%7Botherwise%7D%0D%0A%5Cend%7Bcases%7D"></div>

and

<!-- $$ v + \tilde w = \begin{cases}
e^{i\varpi} \left(\frac{2(e^{\delta_v} + e^{\delta_w})}{(e^{\delta_v} + 1)(e^{\delta_w} + 1)} - \frac{e^{\delta_w - 1}}{e^{\delta_w + 1}}(e^{i\eta} - 1)\right), & \bigl| |v| - |w| \bigr| < \varepsilon_r\text{ and }|\eta| < \varepsilon_{\eta}  \\
\text{direct calculation}, &\text{otherwise}
\end{cases} $$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/v%20%2B%20%5Ctilde%20w%20%3D%20%5Cbegin%7Bcases%7D%0D%0Ae%5E%7Bi%5Cvarpi%7D%20%5Cleft(%5Cfrac%7B2(e%5E%7B%5Cdelta_v%7D%20%2B%20e%5E%7B%5Cdelta_w%7D)%7D%7B(e%5E%7B%5Cdelta_v%7D%20%2B%201)(e%5E%7B%5Cdelta_w%7D%20%2B%201)%7D%20-%20%5Cfrac%7Be%5E%7B%5Cdelta_w%20-%201%7D%7D%7Be%5E%7B%5Cdelta_w%20%2B%201%7D%7D(e%5E%7Bi%5Ceta%7D%20-%201)%5Cright)%2C%20%26%20%5Cbigl%7C%20%7Cv%7C%20-%20%7Cw%7C%20%5Cbigr%7C%20%3C%20%5Cvarepsilon_r%5Ctext%7B%20and%20%7D%7C%5Ceta%7C%20%3C%20%5Cvarepsilon_%7B%5Ceta%7D%20%20%5C%5C%0D%0A%5Ctext%7Bdirect%20calculation%7D%2C%20%26%5Ctext%7Botherwise%7D%0D%0A%5Cend%7Bcases%7D"></div>

where <!-- $\eta = \varphi - \varpi + \pi = \operatorname{arg}(w) - \operatorname{arg}(v) + \pi \pmod{2\pi}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Ceta%20%3D%20%5Cvarphi%20-%20%5Cvarpi%20%2B%20%5Cpi%20%3D%20%5Coperatorname%7Barg%7D(w)%20-%20%5Coperatorname%7Barg%7D(v)%20%2B%20%5Cpi%20%5Cpmod%7B2%5Cpi%7D"> with <!-- $|\eta| \ll 1$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%7C%5Ceta%7C%20%5Cll%201">.

For an accurate calculation of <!-- $\delta_u = \log\left( \frac{2}{r_u^*} - 1 \right)$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cdelta_u%20%3D%20%5Clog%5Cleft(%20%5Cfrac%7B2%7D%7Br_u%5E*%7D%20-%201%20%5Cright)"> for (exponentially) small <!-- $r_u^*$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/r_u%5E*">, consider the Laurent series expansion of <!-- $\log x - \log(x-1)$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Clog%20x%20-%20%5Clog(x-1)"> at <!-- $x=\infty$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/x%3D%5Cinfty">:

<!-- $$ \log x - \log(x\mp 1) = \sum_{k=1}^\infty \frac{(\pm 1)^k}{kx^k}. $$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/%5Clog%20x%20-%20%5Clog(x%5Cmp%201)%20%3D%20%5Csum_%7Bk%3D1%7D%5E%5Cinfty%20%5Cfrac%7B(%5Cpm%201)%5Ek%7D%7Bkx%5Ek%7D."></div>

Thus, for <!-- $r_u^* < 2 \varepsilon_{\rho}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/r_u%5E*%20%3C%202%20%5Cvarepsilon_%7B%5Crho%7D"> small enough,

<!-- $$ \begin{aligned}
\delta_u = \log\left( \frac{2}{r_u^*} - 1 \right) &= \log \frac{2}{r_u^*} - \sum_{k=1}^\infty \frac{(r_u^*)^k}{k 2^k}
\\&= 2 \log(e^{\delta_v} + 1) + 2\log(e^{\delta_w} + 1) - \log 8 - (\delta_v + \delta_w)
\\&\quad - \log |1+\bar v w| - \log(|1+\bar v w| + |v + w|) - \sum_{k=1}^\infty \frac{(r_u^*)^k}{k 2^k}
\\&= (\delta_v + \delta_w) - \log 8 + 2 \log(1 + e^{-\delta_v}) + 2\log(1 + e^{-\delta_w})
\\&\quad - \log |1+\bar v w| - \log(|1+\bar v w| + |v + w|) - \sum_{k=1}^\infty \frac{(r_u^*)^k}{k 2^k}.
\end{aligned} $$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/%5Cbegin%7Baligned%7D%0D%0A%5Cdelta_u%20%3D%20%5Clog%5Cleft(%20%5Cfrac%7B2%7D%7Br_u%5E*%7D%20-%201%20%5Cright)%20%26%3D%20%5Clog%20%5Cfrac%7B2%7D%7Br_u%5E*%7D%20-%20%5Csum_%7Bk%3D1%7D%5E%5Cinfty%20%5Cfrac%7B(r_u%5E*)%5Ek%7D%7Bk%202%5Ek%7D%0D%0A%5C%5C%26%3D%202%20%5Clog(e%5E%7B%5Cdelta_v%7D%20%2B%201)%20%2B%202%5Clog(e%5E%7B%5Cdelta_w%7D%20%2B%201)%20-%20%5Clog%208%20-%20(%5Cdelta_v%20%2B%20%5Cdelta_w)%0D%0A%5C%5C%26%5Cquad%20-%20%5Clog%20%7C1%2B%5Cbar%20v%20w%7C%20-%20%5Clog(%7C1%2B%5Cbar%20v%20w%7C%20%2B%20%7Cv%20%2B%20w%7C)%20-%20%5Csum_%7Bk%3D1%7D%5E%5Cinfty%20%5Cfrac%7B(r_u%5E*)%5Ek%7D%7Bk%202%5Ek%7D%0D%0A%5C%5C%26%3D%20(%5Cdelta_v%20%2B%20%5Cdelta_w)%20-%20%5Clog%208%20%2B%202%20%5Clog(1%20%2B%20e%5E%7B-%5Cdelta_v%7D)%20%2B%202%5Clog(1%20%2B%20e%5E%7B-%5Cdelta_w%7D)%0D%0A%5C%5C%26%5Cquad%20-%20%5Clog%20%7C1%2B%5Cbar%20v%20w%7C%20-%20%5Clog(%7C1%2B%5Cbar%20v%20w%7C%20%2B%20%7Cv%20%2B%20w%7C)%20-%20%5Csum_%7Bk%3D1%7D%5E%5Cinfty%20%5Cfrac%7B(r_u%5E*)%5Ek%7D%7Bk%202%5Ek%7D.%0D%0A%5Cend%7Baligned%7D"></div>

Otherwise, just <!-- $\delta_u = \log(\frac{2}{r_u^*} - 1)$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cdelta_u%20%3D%20%5Clog(%5Cfrac%7B2%7D%7Br_u%5E*%7D%20-%201)"> would be enough.


#### Calculation of <!-- $\boldsymbol{T_{e^{-i\theta} \dagger^m(w)} \circ T_v = R_\psi \circ T_u}$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cboldsymbol%7BT_%7Be%5E%7B-i%5Ctheta%7D%20%5Cdagger%5Em(w)%7D%20%5Ccirc%20T_v%20%3D%20R_%5Cpsi%20%5Ccirc%20T_u%7D">

Now we can calculate the values of <!-- $\psi$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cpsi">, <!-- $\delta_u$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cdelta_u"> and <!-- $\operatorname{arg}(u)$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Coperatorname%7Barg%7D(u)"> where <!-- $T_{e^{-i\theta} \dagger^m(w)} \circ T_v = R_\psi \circ T_u$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/T_%7Be%5E%7B-i%5Ctheta%7D%20%5Cdagger%5Em(w)%7D%20%5Ccirc%20T_v%20%3D%20R_%5Cpsi%20%5Ccirc%20T_u">, using

<!-- $$ \psi = 2 \operatorname{arg}(1 + \bar v \cdot e^{-i\theta} \dagger^m (w)) $$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/%5Cpsi%20%3D%202%20%5Coperatorname%7Barg%7D(1%20%2B%20%5Cbar%20v%20%5Ccdot%20e%5E%7B-i%5Ctheta%7D%20%5Cdagger%5Em%20(w))"></div>

and

<!-- $$ u = T_v(e^{-i\theta} \dagger^m(w)) $$ --> 

<div align="center"><img style="background: white;" src="https://i.upmath.me/svg/u%20%3D%20T_v(e%5E%7B-i%5Ctheta%7D%20%5Cdagger%5Em(w))"></div>

using calculation methods described above, for appropriate epsilon values <!-- $\varepsilon_r$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cvarepsilon_r">, <!-- $\varepsilon_\eta$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cvarepsilon_%5Ceta">, and <!-- $\varepsilon_\rho$ --> <img style="transform: translateY(0.1em); background: white;" src="https://i.upmath.me/svg/%5Cvarepsilon_%5Crho">.

