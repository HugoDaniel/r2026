const Pi:f32=3.14159265;
const BPM=170.;
const CYCLE_BEATS=8.0;
const NUM_SEQ=9u;
const NUM_CATS=6u;
const SDF_MARGIN_CENTER=0.005;
const GRID_CELLS=10.0;
const TSCALE=2.5;


const MORPH_END=72.0;
const GRID_START=80.0;
const GRID_DONE=133.0;
const ZOOM_END=137.0;
const SCATTER_START=139.0;
const CATS_BEATS=4.0;
const CAT_LOCK_BEAT=186.0;
const FRAME_START=188.0;
const DRIFT_BEGIN=12.0;
const DRIFT_FULL=24.0;

const bg_col=vec3f(0.9,0.8,0.7);
const SC_CELL=0.1;
const SC_ZOOM=0.3;
const SC_MORPH=0.333;
const CLOSED_STATE=12u;
const BORDER_LR=0.03333333;
const BORDER_TB=0.06666666;
const FRAME_CAT_SCALE=2.8;

struct Transform2D{pos:vec2f,angle:f32,scale:vec2f,anchor:vec2f}
struct SDFResult{dist:f32,color:vec3f}
struct CellInfo{cell_uv:vec2f,cell_id:vec2f,is_odd:bool,norm_dist:f32}

const pcol=array<vec3f,7>(vec3f(.773,.561,.702),vec3f(.502,.749,.239),vec3f(.494,.325,.545),vec3f(.439,.573,.235),vec3f(.604,.137,.443),vec3f(.012,.522,.298),vec3f(.133,.655,.42));
const camaradas_seq=array<u32,9>(0u,1u,2u,1u,3u,1u,4u,1u,5u);
const cat_seq=array<u32,6>(6u,7u,8u,9u,10u,11u);

const st_c=array<vec3f,7>(vec3f(.3,2.,Pi*1.25),vec3f(-1.402,1.,Pi*1.5),vec3f(-1.4,-.41,Pi*1.25),vec3f(-.69,.3,Pi*1.75),vec3f(1.3,2.,Pi),vec3f(.015,-1.11,Pi*1.25),vec3f(.015,.3,Pi*.25));
const st_a=array<vec3f,7>(vec3f(.29,-.22,Pi*.25),vec3f(1.,-.2,Pi*.75),vec3f(-.1,-.5,0.),vec3f(-.4,-.22,Pi*.75),vec3f(-.6,0.,Pi*1.5),vec3f(-.4,.495,Pi*1.75),vec3f(-.41,.485,Pi*.75));
const st_m=array<vec3f,7>(vec3f(-.7,0.,Pi*1.25),vec3f(1.41,0.,Pi*.25),vec3f(-1.41,0.,Pi*1.25),vec3f(0.,.71,Pi*1.75),vec3f(-2.11,-.7,Pi*1.75),vec3f(1.4,0.,Pi*1.75),vec3f(.695,-1.41,Pi*.75));
const st_r=array<vec3f,7>(vec3f(0.,0.,Pi*.25),vec3f(-1.,1.66,Pi*1.25),vec3f(-1.,.25,Pi),vec3f(0.,.25,Pi*1.5),vec3f(1.71,1.35,Pi),vec3f(1.1,1.66,Pi*1.75),vec3f(.1,-.7,Pi*.75));
const st_d=array<vec3f,7>(vec3f(-.193,-.4,Pi*.25),vec3f(-1.6,1.7,Pi*1.25),vec3f(-1.6,-1.1,Pi*1.25),vec3f(-.19,.31,Pi*1.75),vec3f(-.195,-.4,Pi*.25),vec3f(-.19,1.,Pi*1.25),vec3f(-.19,.29,Pi*.75));
const st_s=array<vec3f,7>(vec3f(-.4,-.3,Pi*.25),vec3f(1.3,-.59,Pi*.5),vec3f(-1.4,.7,Pi),vec3f(.3,.29,Pi*.75),vec3f(.3,-.175,Pi*1.25),vec3f(-.4,1.7,Pi*.25),vec3f(-1.1,-1.589,Pi*.75));
const st_cat1=array<vec3f,7>(vec3f(.7,.79,0.),vec3f(-.5,0.,-Pi*.5),vec3f(-.5,-1.41,Pi*1.25),vec3f(-.21,.29,Pi*.25),vec3f(1.7,1.79,Pi),vec3f(1.2,1.29,Pi*.5),vec3f(-1.,-.91,0.));
const st_cat2=array<vec3f,7>(vec3f(.9,-.21,0.),vec3f(-.8,-.5,Pi),vec3f(.9,-.21,Pi*.5),vec3f(-.095,.205,Pi*1.75),vec3f(.9,-.21,0.),vec3f(1.4,.29,Pi*1.5),vec3f(-1.8,-.5,0.));
const st_cat3=array<vec3f,7>(vec3f(-.1,.91,0.),vec3f(-.51,-.5,-Pi*.75),vec3f(.9,-.5,Pi*1.75),vec3f(.9,-1.9,Pi*1.25),vec3f(.9,1.91,Pi),vec3f(.4,1.41,Pi*.5),vec3f(.19,-.5,Pi*.25));
const st_cat4=array<vec3f,7>(vec3f(-1.02,.5,0.),vec3f(-.515,0.,Pi),vec3f(.9,0.,Pi*.25),vec3f(.19,-.71,Pi*.25),vec3f(-1.02,.5,0.),vec3f(-.52,1.,Pi*1.5),vec3f(1.61,-1.42,Pi*.75));
const st_cat5=array<vec3f,7>(vec3f(-1.,-.25,0.),vec3f(.91,-.75,Pi*.25),vec3f(1.61,-1.458,-Pi*.25),vec3f(.2,-.04,Pi*.25),vec3f(-1.,-.25,0.),vec3f(-.5,.25,Pi*1.5),vec3f(.2,-.46,0.));
const st_cat6=array<vec3f,7>(vec3f(1.3,-.86,Pi*.666),vec3f(.91,-.75,Pi*.666),vec3f(-1.675,-1.085,-Pi*1.085),vec3f(.515,-.65,Pi*1.416),vec3f(.61,-.67,Pi*.16),vec3f(.8,.005,Pi*1.666),vec3f(-2.49,.05,Pi*.45));

fn xf3(v:vec3f)->Transform2D{return Transform2D(v.xy,v.z,vec2f(1.),vec2f(0.));}

fn get_state_xf(state:u32,pi:u32)->Transform2D{
    var r:Transform2D;
    switch state{
        case 0u:{r=xf3(st_c[pi]);}case 1u:{r=xf3(st_a[pi]);}case 2u:{r=xf3(st_m[pi]);}
        case 3u:{r=xf3(st_r[pi]);}case 4u:{r=xf3(st_d[pi]);}case 5u:{r=xf3(st_s[pi]);}
        case 6u:{r=xf3(st_cat1[pi]);}case 7u:{r=xf3(st_cat2[pi]);}case 8u:{r=xf3(st_cat3[pi]);}
        case 9u:{r=xf3(st_cat4[pi]);}case 10u:{r=xf3(st_cat5[pi]);}case 11u:{r=xf3(st_cat6[pi]);}
        default:{return Transform2D(vec2f(0.),0.,vec2f(1.),vec2f(0.));}
    }
    if((state==2u||state==4u)&&pi==6u){r.scale.x=-1.;}
    return r;
}

const op1=array<vec3f,7>(vec3f(-.25,0.,-Pi*.25),vec3f(0.,.8,-.18),vec3f(-.8,.3,-.18),vec3f(.6,-.6,.33),vec3f(.5,.2,.1),vec3f(-.83,-.2,-.22),vec3f(-.6,-.5,.15));
const op2=array<vec3f,7>(vec3f(.83,-.30,-.65),vec3f(.06,-.20,-.36),vec3f(-.23,.38,-.71),vec3f(-.83,-.18,-.26),vec3f(-.59,-.47,.05),vec3f(-.14,-.94,.95),vec3f(.24,-.89,-.58));
const op3=array<vec3f,7>(vec3f(.59,-.07,.35),vec3f(.25,.08,.54),vec3f(-.96,.59,-.94),vec3f(.27,-.83,-.30),vec3f(.99,.68,-.82),vec3f(.06,.17,.74),vec3f(.87,.73,.91));
const op4=array<vec3f,7>(vec3f(.73,-.18,-.88),vec3f(-.64,.24,.69),vec3f(.49,.68,-.27),vec3f(.02,.76,.78),vec3f(-.00,.47,.58),vec3f(.46,.93,.43),vec3f(-.58,-.32,-.41));
const op5=array<vec3f,7>(vec3f(.46,-.91,-.56),vec3f(.35,.35,.63),vec3f(-.17,-.93,.52),vec3f(-.95,.29,.91),vec3f(-.48,-.94,-.45),vec3f(-.64,-.01,.49),vec3f(-.24,.74,-.54));
const op6=array<vec3f,7>(vec3f(-.55,.12,-.34),vec3f(.62,.17,-.35),vec3f(.31,-.95,.66),vec3f(.61,-.78,.46),vec3f(-.24,.54,.36),vec3f(.05,.93,.12),vec3f(-.98,.96,.95));

fn opened_xf(v:vec3f)->Transform2D{return Transform2D(4.*v.xy,2.*Pi*v.z,vec2f(1.),vec2f(0.));}
fn get_cat_scatter(si:u32,pi:u32)->Transform2D{
    switch si{
        case 0u:{return opened_xf(op1[pi]);}case 1u:{return opened_xf(op2[pi]);}
        case 2u:{return opened_xf(op3[pi]);}case 3u:{return opened_xf(op4[pi]);}
        case 4u:{return opened_xf(op5[pi]);}default:{return opened_xf(op6[pi]);}
    }
}

fn t2l(uv:vec2f,xf:Transform2D)->vec2f{
    var p=uv-xf.pos;let c=cos(xf.angle);let s=sin(xf.angle);
    p=vec2f(c*p.x+s*p.y,-s*p.x+c*p.y);return(p-xf.anchor)/xf.scale;
}
fn ssd(d:f32,xf:Transform2D)->f32{
    let sx=abs(xf.scale.x);let sy=abs(xf.scale.y);
    if(abs(sx-sy)<.001){return d*sx;}let r=max(sx,sy)/min(sx,sy);
    if(r<2.){return d*(2./(1./sx+1./sy));}return d*min(sx,sy);
}
fn sd_box(p:vec2f,b:vec2f)->f32{let d=abs(p)-b;return length(max(d,vec2f(0.)))+min(max(d.x,d.y),0.);}
fn sd_tri(p:vec2f,a:vec2f,b:vec2f,c:vec2f)->f32{
    let e0=b-a;let e1=c-b;let e2=a-c;let v0=p-a;let v1=p-b;let v2=p-c;
    let q0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.);let q1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.);
    let q2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);let s=sign(e0.x*e2.y-e0.y*e2.x);
    let d=min(min(vec2f(dot(q0,q0),s*(v0.x*e0.y-v0.y*e0.x)),vec2f(dot(q1,q1),s*(v1.x*e1.y-v1.y*e1.x))),vec2f(dot(q2,q2),s*(v2.x*e2.y-v2.y*e2.x)));
    return -sqrt(d.x)*sign(d.y);
}

fn mix_xf(a:Transform2D,b:Transform2D,t:f32)->Transform2D{
    return Transform2D(mix(a.pos,b.pos,t),mix(a.angle,b.angle,t),mix(a.scale,b.scale,t),mix(a.anchor,b.anchor,t));
}

fn piece_sdf(p:vec2f,ti:u32,xf:Transform2D)->f32{
    let q=t2l(p,xf);
    switch ti{
        case 0u:{return ssd(min(sd_tri(q,vec2f(.5,.5),vec2f(1.,0.),vec2f(0.)),sd_tri(q,vec2f(1.,0.),vec2f(.5,-.5),vec2f(0.))),xf);}
        case 1u:{return ssd(sd_tri(q,vec2f(-1.,1.),vec2f(0.),vec2f(1.,1.)),xf);}
        case 2u:{return ssd(sd_tri(q,vec2f(-1.,1.),vec2f(0.),vec2f(-1.,-1.)),xf);}
        case 3u:{return ssd(sd_tri(q,vec2f(1.,-1.),vec2f(1.,0.),vec2f(0.,-1.)),xf);}
        case 4u:{return ssd(sd_tri(q,vec2f(1.,1.),vec2f(1.,0.),vec2f(.5,.5)),xf);}
        case 5u:{return ssd(sd_tri(q,vec2f(0.),vec2f(.5,-.5),vec2f(-.5,-.5)),xf);}
        default:{return ssd(min(sd_tri(q,vec2f(-1.,-1.),vec2f(0.,-1.),vec2f(-.5,-.5)),sd_tri(q,vec2f(0.,-1.),vec2f(.5,-.5),vec2f(-.5,-.5))),xf);}
    }
}

fn state_sdf(p:vec2f,state:u32)->SDFResult{
    var res=SDFResult(1e10,vec3f(0.));
    for(var i=0u;i<7u;i++){
        let d=piece_sdf(p,i,get_state_xf(state,i));
        if(d<res.dist){res.dist=d;res.color=pcol[i];}
    }
    res.dist-=.01;
    return res;
}

fn piece_blend_sdf_dissolve(p:vec2f,st_a:u32,st_b:u32,t:f32,scene_xf:Transform2D,dissolve:f32,beat:f32)->SDFResult{
    var q=t2l(p,scene_xf);
    if(dissolve>.001){q+=dissolve*vec2f(sin(q.y*7.+beat),sin(q.x*11.-beat))*.3;}
    var res=SDFResult(1e10,vec3f(0.));
    for(var i=0u;i<7u;i++){
        let xf=mix_xf(get_state_xf(st_a,i),get_state_xf(st_b,i),t);
        let d=ssd(piece_sdf(q,i,xf),scene_xf);
        if(d<res.dist){res.dist=d;res.color=pcol[i];}
    }
    res.dist-=SDF_MARGIN_CENTER;
    return res;
}

fn scene_morph_d(q:vec2f,beat:f32)->f32{
    let raw=u32(floor(beat/CYCLE_BEATS));let phase=min(raw,NUM_SEQ-1u);let next=min(phase+1u,NUM_SEQ-1u);
    let anim_t=fract(beat/CYCLE_BEATS);let d_a=state_sdf(q,camaradas_seq[phase]).dist;
    if(phase==next){return d_a;}
    var mt=0.;if(anim_t>=0.875){mt=smoothstep(0.,1.,(anim_t-0.875)/0.125);}
    if(mt<0.001){return d_a;}
    return mix(d_a,state_sdf(q,camaradas_seq[next]).dist,mt);
}

fn compute_cell(uv01:vec2f,ratio:f32,cells:f32)->CellInfo{
    let cell_res=vec2f(ratio,1.)*uv01*cells;let half_span=vec2f(ratio,1.)*cells*.5;
    let offset=fract(half_span)-vec2f(.5);let centered=cell_res-offset;
    let cell_id=floor(centered);let cell_uv=2.*fract(centered)-vec2f(1.);
    let is_odd=(u32(abs(cell_id.x+cell_id.y))%2u)==0u;
    let center_id=floor(half_span);let nd=length(cell_id-center_id)/(length(half_span)+.001);
    return CellInfo(cell_uv,cell_id,is_odd,nd);
}

fn grid_lines_bg(cell:CellInfo,beat:f32)->vec3f{
    let sq=sd_box(cell.cell_uv,vec2f(1.));
    let glow_t=pow(1.-fract(beat),4.);
    let wave=sin((cell.cell_id.x+cell.cell_id.y)*.5-beat*.5);let pulse=smoothstep(.3,1.,wave);
    let line_w=mix(.06,.22,pulse);
    let is_line=smoothstep(line_w,0.,abs(sq));
    let line_base=vec3f(.82,.80,.78);
    let color_idx=u32(floor(beat))%7u;
    let line_glow=pcol[color_idx]*1.5;
    return mix(bg_col,mix(line_base,line_glow,pulse*glow_t),is_line);
}

fn cell_sdf1_letter(p:vec2f,t:f32,state:u32)->SDFResult{
    let c=cos(t*Pi*.5);let s=sin(t*Pi*.5);
    let rp=mat2x2f(c,s,-s,c)*p;let sq=sd_box(rp,vec2f(1.0001));
    let shape=state_sdf(p*TSCALE,state);let shape_d=shape.dist/TSCALE;
    let blend=1.-abs(t-1.);
    return SDFResult(mix(sq,shape_d,blend),shape.color);
}
fn cell_sdf2_letter(p:vec2f,t:f32,state:u32)->SDFResult{
    let cell=sd_box(p,vec2f(1.0001));let inner=cell_sdf1_letter(p,t,state);
    return SDFResult(max(cell,-inner.dist),inner.color);
}

fn grid_checkered(cell:CellInfo,cell_beat:f32)->vec3f{
    let sq=sd_box(cell.cell_uv,vec2f(1.));
    if(cell_beat<0.){if(cell.is_odd&&sq<=0.){return bg_col;}return vec3f(0.);}
    let max_grid_beats=36.;let is_locked=cell_beat>=max_grid_beats;
    let cycle=cell_beat%16.;let big_cycle=u32(floor(cell_beat/16.));let base=big_cycle*4u;
    var s0:u32;var s1:u32;var s2:u32;var s3:u32;
    if(is_locked){s0=CLOSED_STATE;s1=CLOSED_STATE;s2=CLOSED_STATE;s3=CLOSED_STATE;}
    else{s0=camaradas_seq[(base+0u)%NUM_SEQ];s1=camaradas_seq[(base+1u)%NUM_SEQ];s2=camaradas_seq[(base+2u)%NUM_SEQ];s3=camaradas_seq[(base+3u)%NUM_SEQ];}
    let lb=u32(floor(cycle));let f=fract(cycle);
    var w2s:f32;var b2s:f32;var ws:u32;var bs:u32;
    switch lb{
        case 0u:{w2s=f*.5;b2s=1.;ws=s0;bs=s1;}case 1u:{w2s=.5;b2s=1.;ws=s0;bs=s1;}
        case 2u:{w2s=.5+f*.5;b2s=1.;ws=s0;bs=s1;}case 3u:{w2s=1.;b2s=1.;ws=s0;bs=s1;}
        case 4u:{w2s=1.;b2s=1.-f*.5;ws=s0;bs=s1;}case 5u:{w2s=1.;b2s=.5;ws=s0;bs=s1;}
        case 6u:{w2s=1.;b2s=.5-f*.5;ws=s2;bs=s1;}case 7u:{w2s=1.;b2s=0.;ws=s2;bs=s1;}
        case 8u:{w2s=1.-f*.5;b2s=0.;ws=s2;bs=s1;}case 9u:{w2s=.5;b2s=0.;ws=s2;bs=s3;}
        case 10u:{w2s=.5-f*.5;b2s=0.;ws=s2;bs=s3;}case 11u:{w2s=0.;b2s=0.;ws=s2;bs=s3;}
        case 12u:{w2s=0.;b2s=f*.5;ws=s2;bs=s3;}case 13u:{w2s=0.;b2s=.5;ws=s2;bs=s3;}
        case 14u:{w2s=0.;b2s=.5+f*.5;ws=s2;bs=s3;}
        default:{w2s=0.;b2s=1.;ws=s2;bs=s3;}
    }
    var cr:SDFResult;var blend:f32;var is_w:bool;
    if(cell.is_odd){cr=cell_sdf1_letter(cell.cell_uv,w2s*2.,ws);blend=1.-abs(w2s*2.-1.);is_w=true;}
    else{cr=cell_sdf2_letter(cell.cell_uv,b2s*2.,bs);blend=1.-abs(b2s*2.-1.);is_w=false;}
    if(cr.dist>0.){return vec3f(0.);}
    if(is_w){return mix(bg_col,cr.color,blend);}
    return bg_col;
}

fn tangram_piece_xf(pi:u32,beat:f32)->Transform2D{
    if(beat>=CAT_LOCK_BEAT){return get_state_xf(cat_seq[NUM_CATS-1u],pi);}
    let sb=beat-SCATTER_START;
    if(sb<0.){return Transform2D(vec2f(0.),0.,vec2f(1.),vec2f(0.));}
    let fs=get_cat_scatter(0u,pi);let fc=get_state_xf(cat_seq[0],pi);
    if(sb<1.){return mix_xf(Transform2D(vec2f(0.),0.,vec2f(1.),vec2f(0.)),fs,smoothstep(0.,1.,sb));}
    if(sb<2.){return mix_xf(fs,fc,smoothstep(0.,1.,sb-1.));}
    let lb=sb-2.+CATS_BEATS*.25;
    let phase=u32(floor(lb/CATS_BEATS))%NUM_CATS;let next=(phase+1u)%NUM_CATS;let at=fract(lb/CATS_BEATS);
    let shape=get_state_xf(cat_seq[phase],pi);let si=get_cat_scatter(phase,pi);let so=get_cat_scatter(next,pi);
    if(at<.25){return mix_xf(si,shape,smoothstep(0.,1.,at/.25));}
    else if(at<.75){return shape;}
    else{return mix_xf(shape,so,smoothstep(0.,1.,(at-.75)/.25));}
}

fn render_tangram(corrUv:vec2f,beat:f32)->SDFResult{
    let zoom_t=smoothstep(GRID_DONE,ZOOM_END,beat);
    let sc=mix(SC_CELL,SC_ZOOM,zoom_t);
    let scene_xf=Transform2D(vec2f(0.),0.,vec2f(sc),vec2f(0.));
    let q=t2l(corrUv,scene_xf);
    var res=SDFResult(1e10,vec3f(0.));
    for(var i=0u;i<7u;i++){
        let xf=tangram_piece_xf(i,beat);let pd=piece_sdf(q,i,xf);let d=ssd(pd,scene_xf);
        if(d<res.dist){res.dist=d;res.color=pcol[i];}
    }
    res.dist-=SDF_MARGIN_CENTER;
    res.color=mix(vec3f(.08),res.color,zoom_t);
    return res;
}

fn center_cat_raw(frame_beat:f32)->u32{return(u32(floor(frame_beat))+5u)%NUM_CATS;}
fn cat_reveal_beat(cat_idx:u32)->f32{return f32((cat_idx+1u)%NUM_CATS);}
fn get_drift(frame_beat:f32)->f32{return smoothstep(DRIFT_BEGIN,DRIFT_FULL,frame_beat);}

fn render_cat_morph(corrUv:vec2f,frame_beat:f32)->SDFResult{
    let scene_xf=Transform2D(vec2f(0.),0.,vec2f(SC_ZOOM),vec2f(0.));
    let cur_idx=center_cat_raw(frame_beat);
    let nxt_idx=(cur_idx+1u)%NUM_CATS;
    let cur=cat_seq[cur_idx];
    let nxt=cat_seq[nxt_idx];
    let frac=fract(frame_beat);
    var mt=0.;
    if(frac>=.7){mt=smoothstep(0.,1.,(frac-.7)/.3);}
    let drift=get_drift(frame_beat);
    let rest_val=drift*.5;
    let peak_val=1.-drift*.5;
    let final_mt=mix(rest_val,peak_val,mt);
    let finale_beat=52.;
    let t=smoothstep(DRIFT_BEGIN+4.,finale_beat,frame_beat);
    let dissolve_ramp=t*.15+smoothstep(.6,1.,t)*.85;
    let fft_bass=(A[0]+A[1]+A[2]+A[3])*.25;
    let fft_mid=(A[6]+A[7]+A[8]+A[9])*.25;
    let dissolve=dissolve_ramp*(.5+saturate(fft_bass*1.5+fft_mid*.5));
    return piece_blend_sdf_dissolve(corrUv,cur,nxt,final_mt,scene_xf,dissolve,frame_beat);
}

fn render_frame(uv01:vec2f,screen_res:vec2f,frame_beat:f32)->vec4f{
    let mask=step(BORDER_LR,uv01.x)*(1.-step(1.-BORDER_LR,uv01.x))
            *step(BORDER_TB,uv01.y)*(1.-step(1.-BORDER_TB,uv01.y));
    if(mask>0.){return vec4f(0.,0.,0.,0.);}
    let cell_size=vec2f(BORDER_LR,BORDER_TB);
    let cell_res_px=cell_size*screen_res;
    let cell_ratio=cell_res_px.x/cell_res_px.y;
    let cell_id=floor(uv01/cell_size);
    let cell_coord=2.*fract(uv01/cell_size)-vec2f(1.);
    let cell_uv=vec2f(cell_coord.x,cell_coord.y/cell_ratio);
    let cell_hash=u32(abs(cell_id.x+cell_id.y*31.));
    let cat_idx=cell_hash%NUM_CATS;
    let reveal=cat_reveal_beat(cat_idx);
    if(frame_beat<reveal){return vec4f(0.,0.,0.,1.);}
    let reveal_alpha=smoothstep(reveal,reveal+.5,frame_beat);
    let drift=get_drift(frame_beat);
    let nxt_idx=(cat_idx+1u)%NUM_CATS;
    let blend_t=drift*.5;
    let cell_xf=Transform2D(vec2f(0.),0.,vec2f(1./FRAME_CAT_SCALE),vec2f(0.));
    let br=piece_blend_sdf_dissolve(cell_uv,cat_seq[cat_idx],cat_seq[nxt_idx],blend_t,cell_xf,0.,0.);
    if(br.dist>0.){return vec4f(0.,0.,0.,1.);}
    let active_idx=center_cat_raw(frame_beat);
    let is_active=cat_idx==active_idx;
    let fill_col=mix(vec3f(1.),br.color,select(0.,1.,is_active));
    return vec4f(fill_col*reveal_alpha,1.);
}

fn render_camaradas_word(corrUv:vec2f,beat:f32,scatter:f32)->SDFResult{
    let sc=0.1;
    let sp=0.30;
    let ox=-f32(NUM_SEQ-1u)*sp*.5;
    var res=SDFResult(1e10,vec3f(0.));
    let wb=beat-248.;
    for(var i=0u;i<NUM_SEQ;i++){
        let lt=saturate((wb-f32(i)+f32(i>2u))*10.);
        if(lt<.001){continue;}
        let offset=vec2f(ox+f32(i)*sp,0.);
        let lxf=Transform2D(offset,0.,vec2f(sc),vec2f(0.));
        let q=t2l(corrUv,lxf);
        for(var j=0u;j<7u;j++){
            var pxf=get_state_xf(camaradas_seq[i],j);
            let dir=normalize(pxf.pos+vec2f(.001,.002));
            pxf.pos+=dir*scatter*4.;
            pxf.angle+=scatter*(f32(j)*1.3-.5)*4.;
            let d=ssd(piece_sdf(q,j,pxf),lxf);
            if(d<res.dist){res.dist=d;res.color=pcol[j];}
        }
    }
    return res;
}

fn render_scene(fragCoord:vec2f,res:vec2f)->vec3f{
    let ratio=res.x/res.y;
    let uv01=fragCoord/res;
    let corrUv=(fragCoord*2.-res)/min(res.x,res.y);
    let aa=1.5/min(res.x,res.y);
    let beat=pngine.time*BPM/60.;
    let cell=compute_cell(uv01,ratio,GRID_CELLS);
    let morph_vis=1.-smoothstep(MORPH_END,MORPH_END+8.,beat);
    let checker_vis=smoothstep(MORPH_END,GRID_START,beat);
    let grid_fade=1.-smoothstep(GRID_DONE,GRID_DONE+2.,beat);
    let cell_beat=max(beat-GRID_START,0.)-cell.norm_dist*3.;
    let tangram_vis=smoothstep(GRID_DONE-1.,GRID_DONE,beat);
    let in_frame=beat>=FRAME_START;
    let frame_beat=max(beat-FRAME_START,0.);
    var col=bg_col;
    if(beat<GRID_DONE+2.){
        let bg_lines=grid_lines_bg(cell,beat);
        col=mix(col,bg_lines,1.-checker_vis);
    }
    if(checker_vis>.001&&grid_fade>.001){
        let bg_checker=grid_checkered(cell,cell_beat);
        col=mix(col,bg_checker,checker_vis*grid_fade);
    }
    if(morph_vis>.001){
        let morph_xf=Transform2D(vec2f(0.),0.,vec2f(SC_MORPH),vec2f(0.));
        let q=t2l(corrUv,morph_xf);
        let d=ssd(scene_morph_d(q,min(beat,MORPH_END)),morph_xf);
        if(d<aa){col=mix(col,vec3f(.08),(1.-smoothstep(-aa,aa,d))*morph_vis);}
    }
    if(!in_frame){
        if(beat>SCATTER_START){
            let sb=beat-SCATTER_START;
            let lb=sb-2.+CATS_BEATS*.25;
            let at=fract(lb/CATS_BEATS);
            let hold=smoothstep(.2,.3,at)*(1.-smoothstep(.7,.8,at));
            let ph=u32(floor(lb/CATS_BEATS))%NUM_CATS;
            let gp=fract(corrUv*3.+.5)*2.-1.;
            let cs=state_sdf(gp*2.5,cat_seq[ph]);
            let dg=sin((corrUv.x+corrUv.y)*Pi-beat*1.5);
            if(cs.dist<0.&&dg>0.){col=mix(col,cs.color,dg*.15*hold);}
        }
        if(tangram_vis>.001){
            let tr=render_tangram(corrUv,beat);
            if(tr.dist<aa){col=mix(col,tr.color,(1.-smoothstep(-aa,aa,tr.dist))*tangram_vis);}
        }
    }else{
        let frame_close=smoothstep(240.,248.,beat);
        if(frame_close<.999){
            let vis=1.-frame_close;
            let frame_px=render_frame(uv01,res,frame_beat);
            if(frame_px.w>0.){col=mix(col,frame_px.xyz,vis);}
            else{
                let cm=render_cat_morph(corrUv,frame_beat);
                if(cm.dist<aa){col=mix(col,cm.color,(1.-smoothstep(-aa,aa,cm.dist))*vis);}
            }
        }
        if(beat>=248.){
            let scatter=max(beat-257.,0.);
            let word=render_camaradas_word(corrUv,beat,scatter);
            if(word.dist<aa){col=mix(col,word.color,1.-smoothstep(-aa,aa,word.dist));}
        }
    }
    let bass=(A[0]+A[1]+A[2]+A[3])*.25;
    let mid=(A[8]+A[9]+A[10]+A[11])*.25;
    col+=vec3f(bass*.12,mid*.06,mid*.03);
    return col;
}

@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f{
    let res=vec2f(pngine.width,pngine.height);
    let fragCoord=vec2f(pos.x,res.y-pos.y);
    let col=render_scene(fragCoord,res);
    return vec4f(col,1.);
}

@fragment fn post(@builtin(position) pos:vec4f)->@location(0) vec4f{
    let res=vec2f(pngine.width,pngine.height);
    let uv=pos.xy/res;
    let beat=pngine.time*170./60.;
    let ck=smoothstep(72.,80.,beat)*(1.-smoothstep(133.,135.,beat));
    let ck_cell=floor(uv*10.);
    let ck_flip=mix(1.,select(1.,-1.,(u32(abs(ck_cell.x+ck_cell.y))&1u)==0u),ck);
    let bass=(A[0]+A[1]+A[2]+A[3])*.25;
    let ca=saturate(bass*2.)*2.*.8*(1.-uv.y);
    let ang=beat*.3*ck;
    let rc=cos(ang);let rs=sin(ang);
    let r_off=vec2f(rc*.009-rs*.006,rs*.009+rc*.006)*ca*ck_flip;
    let b_off=vec2f(rc*(-.007)-rs*.004,rs*(-.007)+rc*.004)*ca*ck_flip;
    let r=textureSample(postTex,samp,uv+r_off).r;
    let g=textureSample(postTex,samp,uv).g;
    let b=textureSample(postTex,samp,uv+b_off).b;
    var col=vec3f(r,g,b);
    col=pow(col,vec3f(2.2));
    return vec4f(col,1.);
}
