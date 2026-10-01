package com.authentiq.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class QrPayloadDto {

    @JsonProperty("v")
    private Integer v = 1;

    @JsonProperty("alg")
    private String alg = "ES256";

    @JsonProperty("kid")
    private String kid;

    @JsonProperty("mid")
    private String mid;

    @JsonProperty("pid")
    private String pid;

    @JsonProperty("name")
    private String name;

    @JsonProperty("brand")
    private String brand;

    @JsonProperty("batch")
    private String batch;

    @JsonProperty("mfg")
    private String mfg;

    @JsonProperty("exp")
    private String exp;

    @JsonProperty("sig")
    private String sig;

    public QrPayloadDto() {}

    public QrPayloadDto(Integer v, String alg, String kid, String mid, String pid, String name, String brand, String batch, String mfg, String exp, String sig) {
        this.v = v;
        this.alg = alg;
        this.kid = kid;
        this.mid = mid;
        this.pid = pid;
        this.name = name;
        this.brand = brand;
        this.batch = batch;
        this.mfg = mfg;
        this.exp = exp;
        this.sig = sig;
    }

    public Integer getV() { return v; }
    public void setV(Integer v) { this.v = v; }

    public String getAlg() { return alg; }
    public void setAlg(String alg) { this.alg = alg; }

    public String getKid() { return kid; }
    public void setKid(String kid) { this.kid = kid; }

    public String getMid() { return mid; }
    public void setMid(String mid) { this.mid = mid; }

    public String getPid() { return pid; }
    public void setPid(String pid) { this.pid = pid; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getBatch() { return batch; }
    public void setBatch(String batch) { this.batch = batch; }

    public String getMfg() { return mfg; }
    public void setMfg(String mfg) { this.mfg = mfg; }

    public String getExp() { return exp; }
    public void setExp(String exp) { this.exp = exp; }

    public String getSig() { return sig; }
    public void setSig(String sig) { this.sig = sig; }
}
